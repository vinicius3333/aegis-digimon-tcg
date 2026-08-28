import { EffectTiming, getCardDefinition, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-023 Kaguyamon", () => {
  it("deletes the opponent's lowest-level Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-022", as: "base", dp: 7000 }], hand: [{ card: "EX11-023", as: "kaguya" }] },
        1: {
          battleArea: [
            { card: "EX11-019", as: "low", dp: 2000 },
            { card: "EX11-021", as: "high", dp: 6000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kaguya").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX11-019"), 600);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-019")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-021")).toBe(true);
  });

  it("encodes Alliance, Scapegoat, shared once-per-turn deletion, and any-other-deletion recursion", () => {
    expect(getCardDefinition("EX11-023")).toMatchObject({
      nameEn: "Kaguyamon",
      colors: ["Yellow", "Purple"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      types: ["Puppet", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard("EX11-023")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Puppet"], cost: 3, isAlternate: true }]);
    expect(compiled.effects.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
        expect.objectContaining({ keywords: [{ keyword: "Scapegoat", raw: "＜Scapegoat＞" }] }),
      ]),
    );
    for (const trigger of ["WhenDigivolving", "EndOfOpponentsTurn"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "Delete", target: { filter: { superlative: "lowestLevel" } } }],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            sourceFilter: expect.objectContaining({ excludeSelf: true }),
            actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], payCost: false })],
          },
        ],
      }),
    );
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("deletes the lowest level only at the opponent's turn end", async () => {
    const opponentTurn = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-023", as: "source" }] },
        1: {
          battleArea: [
            { card: "EX11-019", as: "low" },
            { card: "EX11-021", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).fire(EffectTiming.OnEndTurn, opponentTurn.perm("source"));
    expect(opponentTurn.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX11-019");
    expect(opponentTurn.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX11-021");
    assertNoLoudGap(opponentTurn);

    const ownTurn = setupEngine({
      0: { battleArea: [{ card: "EX11-023", as: "source" }] },
      1: { battleArea: [{ card: "EX11-019", as: "target" }] },
    });
    ownTurn.state.turnSeat = 0;
    await advance(ownTurn.engine).fire(EffectTiming.OnEndTurn, ownTurn.perm("source"));
    expect(ownTurn.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(ownTurn);
  });

  it("shares one once-per-turn use between opponent-turn digivolution and turn-end deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-023", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "EX11-021", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX11-021"]);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX11-021"]);
    assertNoLoudGap(s);
  });

  it.each([
    { label: "own", victimSeat: 0 as const },
    { label: "opposing", victimSeat: 1 as const },
  ])("plays a level 4 Puppet from trash when an $label other Digimon is deleted", async ({ victimSeat }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "source" },
            ...(victimSeat === 0 ? [{ card: "BT1-009", as: "victim" }] : []),
          ],
          trash: [{ card: "BT13-035", as: "puppet" }],
        },
        1: { battleArea: victimSeat === 1 ? [{ card: "BT1-009", as: "victim" }] : [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT13-035");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT13-035")).toBe(false);
    assertNoLoudGap(s);
  });

  it("may decline the recursive play, rejects level/trait misses, and never triggers from its own deletion", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "source" },
            { card: "BT1-009", as: "victim" },
          ],
          trash: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    await advance(declined.engine).verb.deletePermanent([declined.perm("victim").permanentId], "byEffect");
    expect(declined.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT13-035");

    const misses = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "source" },
            { card: "BT1-009", as: "victim" },
          ],
          trash: [
            { card: "EX11-022", as: "tooHigh" },
            { card: "BT1-032", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await misses.ready();
    await advance(misses.engine).verb.deletePermanent([misses.perm("victim").permanentId], "byEffect");
    expect(misses.state.players[0]!.battleArea).toHaveLength(1);

    const self = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-023", as: "source" }],
          trash: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await self.ready();
    await advance(self.engine).verb.deletePermanent([self.perm("source").permanentId], "byEffect");
    expect(self.state.players[0]!.battleArea).toHaveLength(0);
    expect(self.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT13-035");
    assertNoLoudGap(declined);
    assertNoLoudGap(misses);
    assertNoLoudGap(self);
  });

  it("uses the recursive play only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "source" },
            { card: "BT1-009", as: "firstVictim" },
            { card: "BT1-010", as: "secondVictim" },
          ],
          trash: [
            { card: "BT13-035", as: "firstPuppet" },
            { card: "BT13-035", as: "secondPuppet" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("firstVictim").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("secondVictim").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT13-035")).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT13-035")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("exposes Alliance through the observable prompt and wins using the ally's DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "attacker", suspended: false },
            { card: "AD1-001", as: "ally", dp: 4000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "alliancePrompt"));
    const prompt = s.events.find(({ kind }) => kind === "alliancePrompt") as Extract<
      ServerEvent,
      { kind: "alliancePrompt" }
    >;
    expect(prompt.eligibleAllyIds).toContain(s.perm("ally").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.events.some(({ kind }) => kind === "allianceResolved")).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses Scapegoat to delete another Digimon and survive battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "source", suspended: true },
            { card: "BT1-009", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 15000 }] },
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

  it("supports both normal colors and a color-unrestricted Puppet alternate route", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-057", false, 4],
      ["BT2-076", false, 4],
      ["BT1-038", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX11-023", as: "source" }] },
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
      await settle(() => s.perm("base").topCard.cardId === "EX11-023");
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-036", as: "base" }], hand: [{ card: "EX11-023", as: "source" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
