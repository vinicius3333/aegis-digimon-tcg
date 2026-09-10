import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-032.js";

// BT19-032 Airdramon — Yellow Lv.4 Champion, 4000 DP, play cost 4, digivolves from a
// Yellow Lv.3 for 2.
//   [On Deletion] 1 of your opponent's Digimon gains ＜Security Attack -1＞until the end of
//                 their turn. Then, if you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.
//   Inherited: ＜Barrier＞.
//
// Knowledge base: `node tools/kb/query.mjs card BT19-032` reports no Q&A entries, matching
// docs/audits/BT19.md#knowledge-base-index (0 rulings). Nothing to cover.
//
// Fixtures (all inert main-deck Digimon, never Digi-Eggs, in deck or security):
//   BT1-045 Tsukaimon  — inert Yellow Lv.3, the legal digivolution source.
//   BT1-009 Monodramon — inert Red Lv.3, the illegal digivolution source.
//   BT1-050 Liollmon / BT1-047 Tinkermon — inert opposing Digimon; only one may be picked.
//   BT1-013 / BT1-014 — inert security filler.
describe("BT19-032 Airdramon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-032")).toMatchObject({
      cardId: "BT19-032",
      nameEn: "Airdramon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Mythical Beast"],
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      effectText:
        "[On Deletion] 1 of your opponent's Digimon gains ＜Security Attack -1＞until the end of their turn. Then, if you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.",
      inheritedEffectText: "＜Barrier＞.",
    });
  });

  it("compiles both printed clauses and nothing else", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "GainKeyword",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          keyword: { keyword: "SecurityAttack", amount: -1 },
          // "until the end of THEIR turn" — the opponent's turn end, a real EffectDurationRef.
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.coverage).toBe("full");
  });

  // ---------------------------------------------------------------------------
  // Digivolution routes
  // ---------------------------------------------------------------------------

  it("digivolves from a Yellow Lv.3 for 2 with the bonus draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-045", as: "base" }],
        hand: [{ card: "BT19-032", as: "air" }],
        deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
        security: ["BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-013", "BT1-014"] },
    });
    s.state.memory = 2;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("air").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));

    expect(s.perm("base").topCard?.cardId).toBe("BT19-032");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(4000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Red Lv.3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "red" }],
        hand: [{ card: "BT19-032", as: "air" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-013", "BT1-014"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("red").permanentId,
        instanceId: s.inst("air").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("red").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("red").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-032"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ＜Security Attack -1＞ on exactly one opposing Digimon
  // ---------------------------------------------------------------------------

  it("gives exactly one opposing Digimon Security Attack -1 and never one of yours", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-032", as: "air" },
            { card: "BT1-050", as: "ownPeer" },
          ],
          security: ["BT1-013", "BT1-014", "BT1-010"],
          deck: [{ card: "BT1-011", as: "deckTop" }],
        },
        1: {
          battleArea: [
            { card: "BT1-050", as: "first" },
            { card: "BT1-047", as: "second" },
          ],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("air").permanentId], "byEffect");
    await settle(() => false, 30);

    const opposing = [s.perm("first"), s.perm("second")];
    const reduced = opposing.filter((permanent) => observe(s.engine).keywordAmount(permanent, "SecurityAttack") === -1);
    expect(reduced).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("ownPeer"), "SecurityAttack")).toBe(0);
    // 3 security is above the threshold: no ＜Recovery +1 (Deck)＞.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("recovers exactly 1 card from the top of the deck onto security at 2 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-032", as: "air" }],
          security: [
            { card: "BT1-013", as: "secTop" },
            { card: "BT1-014", as: "secBottom" },
          ],
          deck: [{ card: "BT1-011", as: "recovered" }, "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-050", as: "target" }], security: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("air").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    // ＜Recovery＞ places the deck's top card on TOP of security (CR §16-6).
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("recovered").instanceId,
      s.inst("secTop").instanceId,
      s.inst("secBottom").instanceId,
    ]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("recovers with zero security and leaves the trash alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-032", as: "air" }],
          deck: [{ card: "BT1-011", as: "recovered" }, "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-050", as: "target" }], security: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("air").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-032"]);
  });

  // ---------------------------------------------------------------------------
  // The whole clause through a real battle deletion and a real turn boundary
  // ---------------------------------------------------------------------------

  it("fires On Deletion from a real battle loss and the reduction expires at the opponent's turn end", async () => {
    // Seat 0's Airdramon (4000 DP) attacks the opposing 4000 DP Liollmon: mutual deletion
    // (CR §11-4). The [On Deletion] then lands ＜Security Attack -1＞ on the opponent's other
    // Digimon, and seat 1's own turn end is what expires it.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-032", as: "air" }],
          hand: ["BT1-013"],
          deck: [{ card: "BT1-011", as: "recovered" }, "BT1-010", "BT1-009", "BT1-013", "BT1-014"],
          security: [
            { card: "BT1-013", as: "secTop" },
            { card: "BT1-014", as: "secBottom" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-050", as: "blockerless", suspended: true },
            { card: "BT1-047", as: "survivor" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const survivorInstanceId = s.perm("survivor").topCard!.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const airPermanentId = s.perm("air").permanentId;
    const liollmonPermanentId = s.perm("blockerless").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: airPermanentId,
        target: { kind: "permanent", permanentId: liollmonPermanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.security.length === 3);
    // Both 4000 DP Digimon died in the battle; the survivor carries the reduction.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      survivorInstanceId,
    ]);
    expect(observe(s.engine).keywordAmount(s.perm("survivor"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("recovered").instanceId,
      s.inst("secTop").instanceId,
      s.inst("secBottom").instanceId,
    ]);

    // Run seat 1's whole turn; its end is the duration boundary.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("survivor"), "SecurityAttack")).toBe(-1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("survivor"), "SecurityAttack")).toBe(0);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Inherited ＜Barrier＞ (comprehensive 16-8)
  // ---------------------------------------------------------------------------

  it("grants Barrier only to a host that really carries BT19-032 underneath", async () => {
    // A realistic stack: BT19-032 (Yellow Lv.4) digivolved into BT19-037 Taomon (Yellow Lv.5).
    // The near-miss peer is the same Taomon with an inert Yellow Lv.4 underneath instead.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-037", as: "host", under: ["BT1-045", "BT19-032"] },
          { card: "BT19-037", as: "plainHost", under: ["BT1-045", "BT3-032"] },
        ],
        security: ["BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-013", "BT1-014"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Barrier")).toBe(false);
  });

  it("inherited Barrier trashes the top security card to prevent a battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-037", as: "host", under: ["BT1-045", "BT19-032"] }],
        security: [
          { card: "BT1-013", as: "secTop" },
          { card: "BT1-014", as: "secBottom" },
        ],
      },
      1: { security: ["BT1-013", "BT1-014"] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secBottom").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
  });
});
