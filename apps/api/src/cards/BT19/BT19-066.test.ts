import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

/**
 * BT19-066 Gizamon — Purple/Black Lv.3 Rookie, 1000 DP, play cost 3,
 * evo cost 1 from a Purple or Black Lv.2.
 *
 * Printed clauses:
 *   1. [Digivolve][Pagumon]: Cost 0                                          (main, header)
 *   2. [On Play] By trashing 1 card with the [Composite]/[Wicked God] trait in your hand,
 *      ＜Draw 2＞.                                                            (main)
 *   3. ＜Blocker＞                                                            (inherited)
 *
 * KB: `node tools/kb/query.mjs card BT19-066` reports no knowledge-base entries — no Q&A,
 * errata or banlist row, matching docs/audits/BT19.md#knowledge-base-index (0 references).
 */

const COMPOSITE_CARD = "BT6-012"; // Deltamon: Red Lv.4 [Composite], no effects
const WICKED_GOD_CARD = "BT19-075"; // MoonMillenniummon: Purple Lv.7 [Wicked God]
const NO_TRAIT_CARD = "BT1-009"; // Monodramon: Red Lv.3 [Dragonkin], no effects — near-miss
const PAGUMON = "BT2-007"; // Pagumon: Purple Lv.2 Digi-Egg — the named alternate source
const PURPLE_EGG = "BT2-008"; // Yaamon: Purple Lv.2 Digi-Egg — near-miss, normal route only
const GREEN_EGG = "BT1-007"; // Tanemon: Green Lv.2 Digi-Egg — illegal source
const PLAIN_LV3 = "BT1-009";
const INERT_SECURITY = "BT1-010";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"];

describe("BT19-066 Gizamon", () => {
  it("matches the catalog printing and compiles every clause with no residual", () => {
    expect(getCardDefinition("BT19-066")).toMatchObject({
      cardId: "BT19-066",
      nameEn: "Gizamon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Sea Animal"],
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      inheritedEffectText: "＜Blocker＞.",
    });
    expect(getCardDefinition("BT19-066")?.effectText).toContain("[Digivolve][Pagumon]: Cost 0");

    const card = runtimeCompiledCard("BT19-066");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 2,
            cost: {
              kind: "trash",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  // "with the [X] trait" is an EXACT trait match, not a substring.
                  nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }],
                },
                count: 1,
              },
            },
            optional: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
    // A bracketed [Digivolve][Name] route is an exact-name gate.
    expect(card?.digivolutionRequirement).toEqual([{ namesExact: ["Pagumon"], cost: 0, isAlternate: true }]);
  });

  it("trashes a [Composite] hand card and draws 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-066", as: "giza" },
            { card: COMPOSITE_CARD, as: "cost" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const costId = s.inst("cost").instanceId;
    const spareId = s.inst("spare").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giza").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);

    // Spare + the two drawn deck cards; the [Composite] card paid the cost.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([PLAIN_LV3, "BT1-011", "BT1-012"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(spareId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([costId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014", "BT1-009", "BT1-010"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-066"]);
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  });

  it("accepts the second printed trait token, [Wicked God]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-066", as: "giza" },
            { card: WICKED_GOD_CARD, as: "cost" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const costId = s.inst("cost").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giza").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([costId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([PLAIN_LV3, "BT1-011", "BT1-012"]);
    expect(s.state.memory).toBe(7);
  });

  it("draws nothing when the hand holds only a near-miss trait ([Dragonkin])", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-066", as: "giza" },
            { card: NO_TRAIT_CARD, as: "nearMiss" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const nearMissId = s.inst("nearMiss").instanceId;
    const spareId = s.inst("spare").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giza").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-066"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual([nearMissId, spareId].sort());
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.memory).toBe(7);
  });

  it("is optional: declining the cost leaves the [Composite] card in hand and draws nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-066", as: "giza" },
            { card: COMPOSITE_CARD, as: "cost" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const costId = s.inst("cost").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giza").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-066"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(costId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.memory).toBe(7);
  });

  it("digivolves from [Pagumon] for 0 through the alternate route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: PAGUMON, as: "pagumon" },
        hand: [{ card: "BT19-066", as: "giza" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 8;
    await s.ready();
    const pagumonId = s.perm("pagumon").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pagumon").permanentId,
        instanceId: s.inst("giza").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pagumon").topCard?.cardId === "BT19-066");

    // The [Pagumon] name gate makes this evolution free: no memory moved at all.
    expect(s.state.memory).toBe(8);
    expect(s.perm("pagumon").stack.map((card) => card.instanceId)).toEqual([pagumonId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("falls back to the printed cost 1 from a near-miss purple Lv.2 that is not [Pagumon]", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: PURPLE_EGG, as: "yaamon" },
        hand: [{ card: "BT19-066", as: "giza" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 8;
    await s.ready();
    const yaamonId = s.perm("yaamon").topCard!.instanceId;

    // `useAlternateCost: true` with no matching alternate route silently uses the normal
    // route; only the memory delta (1, not 0) discriminates.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("giza").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard?.cardId === "BT19-066");

    expect(s.state.memory).toBe(7);
    expect(s.perm("yaamon").stack.map((card) => card.instanceId)).toEqual([yaamonId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("refuses a green Lv.2 evolution source on both routes", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: GREEN_EGG, as: "green" },
        hand: [{ card: "BT19-066", as: "giza" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 8;
    await s.ready();
    const gizaId = s.inst("giza").instanceId;

    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("green").permanentId,
          instanceId: gizaId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([gizaId]);
    expect(s.perm("green").topCard?.cardId).toBe(GREEN_EGG);
  });

  it("grants its host ＜Blocker＞, which blocks a real opponent-turn attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: PLAIN_LV3, as: "carrier", dp: 9000, under: ["BT19-066"] },
          { card: PLAIN_LV3, as: "bare", dp: 9000 },
        ],
        security: [
          { card: INERT_SECURITY, as: "own1" },
          { card: INERT_SECURITY, as: "own2" },
        ],
        deck: DECK,
      },
      1: {
        battleArea: [{ card: PLAIN_LV3, as: "attacker", dp: 3000 }],
        security: [{ card: INERT_SECURITY, as: "sec" }],
        deck: DECK,
      },
    });
    await s.ready();

    // Stack proof: identical printed cards, differing only by the digivolution card underneath.
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bare"), "Blocker")).toBe(false);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);

    // The bare peer has no ＜Blocker＞ and cannot answer the window.
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("bare").permanentId }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("carrier").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The 3000-DP attacker died against the 9000-DP blocker; security was never checked.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
