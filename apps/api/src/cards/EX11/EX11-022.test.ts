import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
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

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === instanceId);
}

describe("EX11-022 — [On Play] free [Puppet] play, deleted at turn end", () => {
  it("proves the public On Play and When Digivolving entry paths", async () => {
    const played = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-022", as: "source" },
            { card: "BT13-035", as: "puppet" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    played.state.memory = 7;
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => played.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT13-035"));
    expect(played.state.players[0]!.hand).toHaveLength(0);

    const evolved = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-021", as: "base" }],
          hand: [
            { card: "EX11-022", as: "source" },
            { card: "BT13-035", as: "puppet" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    evolved.state.memory = 3;
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("base").permanentId,
        instanceId: evolved.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolved.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT13-035"));
    expect(evolved.state.memory).toBe(0);
    assertNoLoudGap(played);
    assertNoLoudGap(evolved);
  });

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

  // Q5810: the delayed deletion and any other end-of-turn effect trigger simultaneously, so the
  // turn player chooses the order. The partner must be an end-of-turn effect the resolver can
  // actually offer: `canActivateEffect` drops an effect whose every action is gated and
  // impossible, which is why EX11-070's [End of Your Turn] (a DNA digivolve into an
  // [ExMaquinamon] that is not in hand, plus a ＜Mind Link＞ with no [Maquinamon]-text Digimon)
  // never entered the group and left a single trigger key. P-185's "[End of Your Turn] This
  // Digimon unsuspends" is ungated, so both effects compete for the next slot.
  it("offers the turn player an ordering choice with another simultaneous end-of-turn effect (Q5810)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-185", as: "otherEndOfTurn", suspended: true }],
          hand: [
            { card: "EX11-022", as: "source" },
            { card: "BT13-035", as: "puppet" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009", "BT1-010"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderTriggers: false,
      },
    );
    const puppet = s.inst("puppet");
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => onField(s, puppet.instanceId));

    advance(s.engine).endMainPhaseIfOpen(0);
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
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect(onField(s, puppet.instanceId)).toBe(false);
    // Both simultaneous effects resolved, in the order the turn player chose.
    expect(s.perm("otherEndOfTurn").isSuspended).toBe(false);
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
