import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js"; // register compiled cards so the real OnPlay / OnEndTurn paths run

/**
 * A3 for EX11-022 Karakurumon:
 *
 *   [On Play] [When Digivolving] You may play 1 [Puppet] trait Digimon card with 4000 DP or less
 *             from your hand or trash without paying the cost. At turn end, delete the Digimon
 *             this effect played.
 *
 * The delayed delete compiled to a SubTrigger whose Delete carried `filter.playedByThisEffect`
 * (count "all") — a field no engine source reads, so at turn end the effect deleted EVERY
 * permanent instead of the one it played. It now uses the wired `DelayedDelete` action, which
 * arms the engine's turn-end delete watcher on `ctx.lastPlayedPermanentIds`.
 *
 * documented behavior — AddSelfDeleteEffect(playedPermanent, DeleteTiming.AtTurnEnd).
 * KB Q5809: "Do I delete the Digimon that was played by this card's [On Play] [When Digivolving]
 * effect at the end of the turn? — Yes."
 *
 * Card ids: BT13-035 PawnChessmon (Lv.3 [Puppet], 1000 DP — the play target); AD1-001 Greymon
 * (a plain bystander Digimon that must survive the turn-end delete).
 */

async function fireOnPlayForInstance(s: EngineSetup, instanceId: string): Promise<void> {
  await (
    s.engine as unknown as { fireTimingForInstance(t: EffectTiming, id: string): Promise<void> }
  ).fireTimingForInstance(EffectTiming.OnPlay, instanceId);
}

async function fireEndTurn(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnEndTurn);
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === instanceId);
}

describe("EX11-022 — [On Play] free [Puppet] play, deleted at turn end", () => {
  it("matches the catalog and encodes every clause with the corrected inherited cause and cost union", () => {
    expect(getCardDefinition("EX11-022")).toMatchObject({
      nameEn: "Karakurumon",
      colors: ["Yellow", "Purple"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      types: ["Puppet", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard("EX11-022")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Puppet"], cost: 3, isAlternate: true, baseColors: ["Yellow", "Purple"] },
    ]);
    expect(digivolutionRequirementsFor("EX11-022")).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Scapegoat", raw: "＜Scapegoat＞" }] }),
        expect.objectContaining({
          trigger: "AllTurns",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Replacement",
              event: "wouldLeavePlay",
              leaveCause: "otherThanYourEffect",
              sourceFilter: { isSelfRef: true },
              cost: expect.objectContaining({
                kind: "deleteOwn",
                target: {
                  filter: { controller: "mine", excludeSelf: true, isToken: true },
                  orFilters: [
                    {
                      controller: "mine",
                      excludeSelf: true,
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                    },
                  ],
                  count: 1,
                },
              }),
            }),
          ],
        }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: { op: "lte", value: 4000 },
              nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
            },
            count: 1,
          },
        },
        { kind: "DelayedDelete" },
      ]);
    }
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("deletes ONLY the Digimon it played at turn end, leaving the board alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "me" },
            { card: "AD1-001", as: "bystander" },
          ],
          hand: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const puppet = s.inst("puppet");
    const meId = s.perm("me").topCard!.instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    await fireOnPlayForInstance(s, meId);
    await settle(() => onField(s, puppet.instanceId));
    expect(onField(s, puppet.instanceId)).toBe(true); // the free play happened

    void fireEndTurn(s);
    await settle(() => !onField(s, puppet.instanceId));

    // Exactly the played Digimon dies.
    expect(onField(s, puppet.instanceId)).toBe(false);
    // REVERT-CONFIRM-RED: drop the `DelayedDelete` action => PawnChessmon survives => RED.
    expect(onField(s, meId)).toBe(true);
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: restore the SubTrigger + `playedByThisEffect` Delete (count "all") =>
    // the ignored filter matches every permanent => Karakurumon and Greymon are deleted too => RED.
  });

  it("offers the turn player an ordering choice with another simultaneous end-of-turn effect (Q5810)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "source" },
            { card: "EX11-070", as: "otherEndOfTurn" },
          ],
          hand: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderTriggers: false,
      },
    );
    const puppet = s.inst("puppet");
    await fireOnPlayForInstance(s, s.perm("source").topCard.instanceId);
    await settle(() => onField(s, puppet.instanceId));

    const resolving = fireEndTurn(s);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(onField(s, puppet.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("arms nothing when the effect plays no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "me" },
            { card: "AD1-001", as: "bystander" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const meId = s.perm("me").topCard!.instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    // No [Puppet] Digimon in hand or trash: the optional play resolves to nothing.
    await fireOnPlayForInstance(s, meId);
    await fireEndTurn(s);

    expect(onField(s, meId)).toBe(true);
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: the old always-true `playedByThisEffect` Delete fires at turn end even
    // though nothing was played => both permanents are deleted => RED.
  });

  it("plays the same eligible Puppet from trash when digivolving, but rejects DP and trait misses", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-022", as: "source" }],
          trash: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(accepted.engine).fire(EffectTiming.WhenDigivolving, accepted.perm("source"));
    await settle(() => accepted.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT13-035"));
    expect(accepted.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(accepted);

    const rejected = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-022", as: "source" }],
          hand: [
            { card: "EX11-021", as: "tooLarge" },
            { card: "BT1-032", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(rejected.engine).fire(EffectTiming.OnPlay, rejected.perm("source"));
    expect(rejected.state.players[0]!.hand).toHaveLength(2);
    expect(rejected.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(rejected);
  });

  it("may decline the free Puppet play and therefore arms no delayed deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "source" },
            { card: "BT1-009", as: "bystander" },
          ],
          hand: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await fireEndTurn(s);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("uses printed Scapegoat to delete another Digimon and survive battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "source", suspended: true },
            { card: "BT1-009", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const fodderId = s.perm("fodder").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Scapegoat")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourceId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it.each([
    { label: "Token", fodder: "TOKEN-Familiar-Token" },
    { label: "other Puppet", fodder: "BT13-035" },
  ])("inherits leave prevention by deleting a $label", async ({ fodder }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: ["EX11-022"] },
            { card: fodder, as: "fodder" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const fodderId = s.perm("fodder").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not replace its controller's own effect and does not accept an unrelated Digimon as cost", async () => {
    const ownEffect = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: ["EX11-022"] },
            { card: "BT13-035", as: "puppet" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    ownEffect.state.turnSeat = 0;
    await ownEffect.ready();
    const puppetId = ownEffect.perm("puppet").permanentId;
    expect(await advance(ownEffect.engine).verb.deletePermanent([ownEffect.perm("host").permanentId], "byEffect")).toBe(
      1,
    );
    expect(ownEffect.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === puppetId)).toBe(true);
    expect(ownEffect.decisions.some(({ req }) => req.kind === "optional")).toBe(false);

    const wrongCost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: ["EX11-022"] },
            { card: "BT1-009", as: "nonPuppet" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    wrongCost.state.turnSeat = 1;
    expect(await advance(wrongCost.engine).verb.deletePermanent([wrongCost.perm("host").permanentId], "byEffect")).toBe(
      1,
    );
    expect(wrongCost.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(wrongCost);
  });

  it("may decline inherited prevention and can use it only once per turn", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: ["EX11-022"] },
            { card: "BT13-035", as: "puppet" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.turnSeat = 1;
    const puppetId = declined.perm("puppet").permanentId;
    expect(await advance(declined.engine).verb.deletePermanent([declined.perm("host").permanentId], "byEffect")).toBe(
      1,
    );
    expect(declined.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === puppetId)).toBe(true);

    const once = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: ["EX11-022"] },
            { card: "BT13-035", as: "firstPuppet" },
            { card: "BT13-035", as: "secondPuppet" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    once.state.turnSeat = 1;
    const hostId = once.perm("host").permanentId;
    expect(await advance(once.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    expect(await advance(once.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(once.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(once);
  });

  it("supports normal yellow/purple cost 4 and Puppet cost 3 evolution, and rejects off-color level 4", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-051", false, 4],
      ["BT2-074", false, 4],
      ["EX11-021", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX11-022", as: "source" }] },
      });
      s.state.memory = memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX11-022");
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "base" }], hand: [{ card: "EX11-022", as: "source" }] },
    });
    invalid.state.memory = 4;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const wrongColorPuppet = setupEngine({
      0: { battleArea: [{ card: "BT10-085", as: "base" }], hand: [{ card: "EX11-022", as: "source" }] },
    });
    wrongColorPuppet.state.memory = 3;
    expect(
      wrongColorPuppet.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColorPuppet.perm("base").permanentId,
        instanceId: wrongColorPuppet.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
