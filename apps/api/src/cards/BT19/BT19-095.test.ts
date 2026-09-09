import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-095 Knight Device — Green Option, [Device] trait, use cost 3.
//   While you don't have [Knight Device], you may ignore this card's color requirements.
//   When an effect trashes this card in your battle area, 1 of your Digimon gains ＜Piercing＞
//     and gets +4000 DP until the end of your opponent's turn.
//   [Main] 1 of your Digimon gains ＜Piercing＞ and gets +4000 DP until the end of your
//     opponent's turn. Then, place this card in the battle area.
//   [Security] Suspend 2 of your opponent's Digimon or Tamers. Then, add this card to the hand.
//
// KB Q3170 (2024-09-20): "If this card is in the battle area and is trashed during my
// opponent's turn, how long does its 2nd effect last?" — "The 2nd effect will last until the
// end of your opponent's turn." BT19-093 carries the same question as Q3166 and PRINTS that
// duration, as do BT19-098 and P-159. The catalog record was corrected to the cycle wording
// (SOURCE-RECONCILIATION.md), so BOTH grant clauses are `untilOpponentTurnEnd`: the grant
// survives the controller's own turn end and expires at the opponent's turn end.
//
// Fixture vocabulary:
//   BT19-093 Queen Device — Yellow Option, [Device] trait: the NAME near-miss for the
//     "[Knight Device]" colour-waiver gate (same trait and same cycle, different name).
//   BT1-064 Goblimon — inert GREEN Lv.3 Digimon, the legitimate CR 4-22-2 colour source.
//   BT2-052 Hagurumon — inert BLACK Lv.3 Digimon: a board permanent that is NOT a colour
//     source for a green Option, so the waiver is load-bearing in every play test.
//   BT19-086 Ryo Akiyama + P-155 Pawn Device ×3 — the real `deleteOwn` battle-area trash that
//     fires the "when this card is trashed in your battle area" clause.
//   BT1-009 / BT1-013 / BT1-012 / BT1-014 — inert RED main-deck Digimon: deck and security
//     padding. No Digi-Egg is seeded in any deck or security stack.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1 = 0): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

describe("BT19-095 Knight Device — catalog and IR", () => {
  it("matches the catalog record", () => {
    expect(getCardDefinition("BT19-095")).toMatchObject({
      cardId: "BT19-095",
      nameEn: "Knight Device",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      types: ["Device"],
      maxCountInDeck: 4,
      effectText:
        "While you don't have [Knight Device], you may ignore this card's color requirements.When an effect trashes this card in your battle area, 1 of your Digimon gains ＜Piercing＞and gets +4000 DP until the end of your opponent's turn.\n[Main] 1 of your Digimon gains ＜Piercing＞and gets +4000 DP until the end of your opponent's turn. Then, place this card in the battle area.",
      securityEffectText: "[Security] Suspend 2 of your opponent's Digimon or Tamers. Then, add this card to the hand.",
    });
  });

  it("compiles the four printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-095");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHaveNone",
              // Bracketed `[Knight Device]` is an EXACT-name reference.
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Knight Device"], match: "nameExact" }] },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            amount: 4000,
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
            keyword: { keyword: "Piercing" },
            duration: "untilOpponentTurnEnd",
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "whenTrashedFromBattleArea",
        actions: [
          { kind: "ModifyDP", amount: 4000, duration: "untilOpponentTurnEnd" },
          { kind: "GainKeyword", keyword: { keyword: "Piercing" }, duration: "untilOpponentTurnEnd" },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 } },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });
});

describe("BT19-095 Knight Device — use cost and the colour-requirement waiver", () => {
  const playBoard = (own: (string | { card: string; as?: string })[]) => ({
    0: {
      hand: [{ card: "BT19-095", as: "knight" }],
      battleArea: own,
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
    1: { deck: [...inertDeck], security: [...inertSecurity] },
  });

  it("costs 3 memory and plays with NO green permanent: the waiver is on", async () => {
    const s = setupEngine(playBoard([{ card: "BT2-052", as: "black" }]), { autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(0);
    expect(boardCardIds(s)).toEqual(["BT19-095", "BT2-052"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the play once a [Knight Device] is already in your battle area and no green permanent is", async () => {
    const s = setupEngine(
      playBoard([
        { card: "BT19-095", as: "onBoard" },
        { card: "BT2-052", as: "black" },
      ]),
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    // FAILS-WHEN-REVERTED (the `youHaveNone [Knight Device]` condition): a waiver with no
    // condition would let this play through.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("knight").instanceId]);
    expect(boardCardIds(s)).toEqual(["BT19-095", "BT2-052"]);
  });

  it("near-miss peer: a Queen Device in the battle area does NOT switch the waiver off", async () => {
    const s = setupEngine(
      playBoard([
        { card: "BT19-093", as: "queen" },
        { card: "BT2-052", as: "black" },
      ]),
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    // FAILS-WHEN-REVERTED (the gate being a NAME gate): a [Device]-trait gate would see Queen
    // Device and refuse this play. Note `nameExact` vs the substring `name` is NOT separable
    // behaviourally for this card — no printed card name contains "Knight Device" as a strict
    // substring — so the exactness itself is pinned only by the IR test above.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.memory).toBe(0);
    expect(boardCardIds(s)).toEqual(["BT19-093", "BT19-095", "BT2-052"]);
  });

  it("pays the printed Green requirement normally when a green permanent IS present", async () => {
    const s = setupEngine(
      playBoard([
        { card: "BT19-095", as: "onBoard" },
        { card: "BT1-064", as: "green" },
      ]),
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.memory).toBe(0);
    expect(boardCardIds(s)).toEqual(["BT19-095", "BT19-095", "BT1-064"].sort());
  });
});

describe("BT19-095 Knight Device — [Main] ＜Piercing＞ + 4000 DP, then place this card", () => {
  const mainBoard = {
    0: {
      hand: [{ card: "BT19-095", as: "knight" }],
      battleArea: [{ card: "BT1-064", as: "host", dp: 3000 }],
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
    1: {
      battleArea: [{ card: "BT2-052", as: "theirs", dp: 3000 }],
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
  };

  it("buffs ONE of YOUR Digimon with both halves and then places itself in the battle area", async () => {
    const s = setupEngine(mainBoard, { autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    // Both halves landed on the SAME permanent (`sameTarget: true`), pinned by identity.
    expect(s.perm("host").currentDP).toBe(7000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    // "Then, place this card in the battle area" — the Option is a permanent, not trashed.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.inst("host").instanceId, s.inst("knight").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // FAILS-WHEN-REVERTED (`controller: "mine"`): the opponent's Digimon is untouched.
    expect(s.perm("theirs").currentDP).toBe(3000);
    expect(observe(s.engine).hasPierce(s.perm("theirs"))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the [Main] grant survives your own turn end and expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-095", as: "knight" },
            { card: "BT1-009", as: "spare0" },
          ],
          battleArea: [{ card: "BT1-064", as: "host", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: { hand: [{ card: "BT1-009", as: "spare1" }], deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === 7000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    // Hand the turn over for real; seat 1 holds a playable card so its Main stays open and the
    // read below is INSIDE the opponent's turn, not after it.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // FAILS-WHEN-REVERTED (`untilOpponentTurnEnd` -> `forTheTurn`): a "for the turn" grant is
    // swept at seat 0's own turn end and would read 3000 here.
    expect(s.perm("host").currentDP).toBe(7000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    // The opponent's turn ends: the grant expires at exactly that boundary.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("host").currentDP).toBe(3000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-095 Knight Device — when this card is trashed in your battle area", () => {
  /** Ryo's [Main] pays `deleteOwn` on 4 battle-area [Device] Options, one of them the Knight. */
  const trashBoard = {
    0: {
      battleArea: [
        { card: "BT19-086", as: "ryo" },
        { card: "BT1-064", as: "host", dp: 3000 },
        { card: "P-155", as: "device0" },
        { card: "P-155", as: "device1" },
        { card: "P-155", as: "device2" },
        { card: "BT19-095", as: "knight" },
      ],
      hand: [
        { card: "EX3-050", as: "cyber" },
        { card: "BT1-009", as: "spare0" },
      ],
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
    1: { hand: [{ card: "BT1-009", as: "spare1" }], deck: [...inertDeck], security: [...inertSecurity] },
  };

  const activateRyo = (s: EngineSetup): { ok: boolean } => {
    const entries = JSON.parse(s.perm("ryo").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(entries.length).toBeGreaterThan(0);
    return s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("ryo").topCard!.instanceId,
      effectKey: entries[0]!.effectKey,
    }) as { ok: boolean };
  };

  it("fires on a real battle-area trash and grants ＜Piercing＞ + 4000 DP to one of your Digimon", async () => {
    const s = setupEngine(trashBoard, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    const knightInstance = s.inst("knight").instanceId;

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX3-050"));

    // The Knight really left the battle area for the trash...
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === knightInstance)).toBe(true);
    // ... and its on-trash clause resolved on the only Digimon that could receive it.
    expect(s.perm("host").currentDP).toBe(7000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("KB Q3170: the grant survives the controller's own turn end and lasts through the opponent's turn", async () => {
    const s = setupEngine(trashBoard, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // FAILS-WHEN-REVERTED (`untilOpponentTurnEnd` -> `forTheTurn`): the grant would already be
    // swept at seat 0's turn end and read 3000 here. This is the KB Q3170 window.
    expect(s.perm("host").currentDP).toBe(7000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    // The opponent's turn ends: the grant expires at exactly that boundary.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("host").currentDP).toBe(3000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-095 Knight Device — [Security] suspend 2, then add this card to the hand", () => {
  it("suspends two of the security player's opponent's Digimon from a REAL security check", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "attacker", dp: 3000 },
            { card: "BT2-056", as: "bench0", dp: 3000 },
            { card: "BT2-060", as: "bench1", dp: 9000 },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT1-064", as: "wall", dp: 3000 }],
          deck: [...inertDeck],
          security: [{ card: "BT19-095", as: "knight" }, "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    await s.ready();
    // The already-suspended attacker is a LEGAL choice (15-15-5-1), so bias the pick toward the
    // two unsuspended benched Digimon to make the count observable.
    prefer.push(s.perm("bench0").topCard!.instanceId, s.perm("bench1").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("knight").instanceId));

    // Both of the security player's opponent's BENCHED Digimon are suspended (the attacker
    // was already suspended by its own declaration), pinned by permanent identity.
    expect(s.perm("bench0").isSuspended).toBe(true);
    expect(s.perm("bench1").isSuspended).toBe(true);
    // FAILS-WHEN-REVERTED (`controller: "opponent"`): the security player's own wall is never
    // a candidate.
    expect(s.perm("wall").isSuspended).toBe(false);
    // "Then, add this card to the hand" — it left security for the security player's hand.
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("knight").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also suspends a Tamer: the [Security] filter is Digimon OR Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "attacker", dp: 3000 },
            { card: "BT19-086", as: "tamer" },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          deck: [...inertDeck],
          security: [{ card: "BT19-095", as: "knight" }, "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("knight").instanceId));

    // FAILS-WHEN-REVERTED (`kind: ["Digimon", "Tamer"]`): a Digimon-only filter leaves Ryo up.
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
