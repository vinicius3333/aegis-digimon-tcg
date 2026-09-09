import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-037.js";

// Fixtures:
//   BT1-102  Blade of the True   Yellow Option cost 2   — single colour, eligible
//   BT12-104 Shining Blast       Yellow/Red Option cost 5 — two colours, near miss
//   BT1-107  Holy Wave           Yellow Option cost 6   — cost near miss
//   BT1-051  Reppamon            Lv4 Yellow, inert       — blast/normal digivolve base
//   BT1-013  Muchomon            Lv3 Red, inert          — opponent opener
//   BT3-076  Candlemon           Lv3 Purple, inert       — the Digimon the effect picks
//   BT15-075 Loogarmon           Lv4 Purple/Red, "[When Digivolving] [When Attacking] By
//            trashing 1 card in your hand, this Digimon gets +2000 DP for the turn."
const DECK = ["BT1-009", "BT1-010", "BT1-012", "BT1-013", "BT1-014", "BT1-009"];

describe("BT19-037 Taomon", () => {
  it("matches the catalog printed identity, ACE overflow and text", () => {
    expect(getCardDefinition("BT19-037")).toMatchObject({
      cardId: "BT19-037",
      nameEn: "Taomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Wizard"],
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      isAce: true,
      overflowMemory: 3,
      inheritedEffectText: "[When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.",
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    for (const index of [1, 2] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger: index === 1 ? "OnPlay" : "WhenDigivolving",
        actions: [
          {
            kind: "UseOptionWithoutCost",
            payCost: false,
            optional: true,
            filter: { kind: ["Option"], colorCount: 1, playCostLte: 5 },
            condition: { kind: "isYourTurn" },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "SecurityAttack", amount: -1 },
            duration: "untilOpponentTurnEnd",
            condition: { kind: "isOpponentsTurn" },
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "DisableTimingEffect",
            timings: ["whenDigivolving"],
            duration: "untilOpponentTurnEnd",
            condition: { kind: "isOpponentsTurn" },
            // "1 of their Digimon gains ... AND can't activate": one printed choice, so the
            // restriction lands on the SAME Digimon the keyword did.
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          },
        ],
      });
    }
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: -4000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] If it's your turn, ... use 1 single-colour Option
  // with a cost of 5 or less from your hand without paying the cost.
  // ---------------------------------------------------------------------------

  it("uses one eligible single-colour Option for free on a public play, leaving the near misses in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-037", as: "taomon" },
            { card: "BT1-102", as: "option" },
            { card: "BT12-104", as: "twoColour" },
            { card: "BT1-107", as: "tooExpensive" },
          ],
          deck: [{ card: "BT1-014", as: "optionDraw" }, ...DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "theirs" }], security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await drainMicrotasks(60);

    // 10 - 5 (Taomon's play cost). The Option's own cost of 2 was waived.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    // The Option really resolved: "＜Draw 1＞ for every 2 security cards you have" with 2 security.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("optionDraw").instanceId);
    for (const alias of ["twoColour", "tooExpensive"]) {
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst(alias).instanceId);
    }
    // It is OUR turn, so neither opponent-turn clause applied.
    expect(observe(s.engine).keywordAmount(s.perm("theirs"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("theirs"), "whenDigivolving")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the Option on the [When Digivolving] timing of a public digivolve as well", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT19-037", as: "taomon" }, { card: "BT1-102", as: "option" }, "BT1-013"],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await drainMicrotasks(60);

    // 5 - 3 (the printed yellow Lv4 evoCost); the Option was still free.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-037");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("leaves the Option in hand when the optional use is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-037", as: "taomon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taomon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks(80);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // [Hand] [Counter] ＜Blast Digivolve＞ + the opponent's-turn clauses
  // ---------------------------------------------------------------------------

  it("blast digivolves in the opponent's counter window and locks one of their Digimon (Q5536-Q5539)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT19-037", as: "taomon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-010", as: "sec2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "opener" },
            { card: "BT3-076", as: "locked" },
          ],
          hand: [
            { card: "BT15-075", as: "loogarmon" },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;

    // The opener's attack opens the [Counter] window ＜Blast Digivolve＞ answers.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opener").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("taomon").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-037");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Blast Digivolve waived the memory cost and still drew the digivolution bonus card.
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    // The unchosen attacker kept its normal ＜Security Attack＞: one card was checked.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);

    // Q5536/Q5539: the chosen Digimon digivolves. Its "[When Digivolving] By trashing 1 card in
    // your hand, +2000 DP" cannot activate, so neither the "by" cost nor the DP happens.
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("loogarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard?.cardId === "BT15-075");
    await drainMicrotasks(80);
    expect(s.perm("locked").currentDP).toBe(5000);
    // The "by trashing 1 card in your hand" cost was never paid: the fodder card is still there
    // (hand = fodder + this turn's draw + the digivolution bonus draw).
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(3);

    // Q5537: the SAME effect still activates on the [When Attacking] timing.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
    // ＜Security A. -1＞ on that same Digimon: 1 - 1 = 0 security cards checked.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suppressed [When Digivolving] does not consume the effect's [Once Per Turn] (Q5540)", async () => {
    // BT25-027 prints one "[When Digivolving] [When Attacking] [Once Per Turn]" effect. The
    // locked Digimon digivolves into it (that timing cannot activate, so it is not an instance
    // of the [Once Per Turn]) and then attacks, where the same effect still activates.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "base" },
            { card: "BT1-045", as: "bait" },
          ],
          hand: [{ card: "BT19-037", as: "taomon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-010", as: "sec2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "opener" },
            { card: "BT1-037", as: "locked" },
          ],
          hand: [{ card: "BT25-027", as: "kudamon" }],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opener").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("taomon").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-037");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // The suppressed digivolve: the bait Digimon is NOT returned to hand.
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("kudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard?.cardId === "BT25-027");
    await drainMicrotasks(80);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT1-045", "BT19-037"].sort(),
    );

    // The attack timing: the [Once Per Turn] was never spent, so the effect activates here.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-037"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bait").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // ACE Overflow ＜3＞
  // ---------------------------------------------------------------------------

  it("pays ACE Overflow ＜3＞ when it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-037", as: "taomon" }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: ["BT1-009"],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("taomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await drainMicrotasks(60);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-037"]);
    expect(s.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Inherited [When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.
  // ---------------------------------------------------------------------------

  it("gives exactly one opponent Digimon -4000 DP from under a real host, and only for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", dp: 20_000, under: ["BT19-037"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "chosen", dp: 9000 },
            { card: "BT1-012", as: "other", dp: 9000 },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId, s.perm("chosen").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("chosen").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(9000);
    advance(s.engine).endMainPhaseIfOpen(0);

    // "For the turn" — gone by the opponent's own Main phase.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("chosen").currentDP).toBe(9000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not carry the inherited attack effect when BT19-037 is not in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", dp: 20_000, under: ["BT1-045"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "peer", dp: 9000 }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("peer").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
