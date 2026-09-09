import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-052 Vespamon (Green/Black, Lv.5 Ultimate/Virus, DP 8000, play cost 8,
// digivolve Green Lv.4 cost 4 / Black Lv.4 cost 4).
//
//   [Digivolve] Lv.4 w/[Royal Base] trait: Cost 3
//   [Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain <Blocker>
//   [On Play] [When Digivolving] Delete 1 of your opponent's Digimon with a play cost of
//     2 or less. For each of your face-up security cards, add 2 to this effect's maximum
//     play cost.
//   [Rule] Trait: Has the [Insectoid] type.
//   Inherited: [All Turns] [Once Per Turn] When this Digimon deletes your opponent's
//     Digimon in battle, trash their top security card.
//
// Fixture cards
//   Royal Base peers: BT18-046 Waspmon (Lv.4), BT19-045 FunBeemon (Lv.3),
//     BT19-053 QueenBeemon (Lv.6, the real next step of this line).
//   Near misses: BT1-066 Tentomon and BT1-073 Kabuterimon are Green [Insectoid] Digimon
//     WITHOUT the [Royal Base] trait, so every "[Royal Base] trait" filter must skip them.
//   Play-cost ladder for the deletion ceiling: BT1-009 (2), BT1-013 (3), BT1-071 (4),
//     BT1-020 (5), BT1-019 (6), BT1-024 (7) — all inert main-deck Digimon.
//   BT9-100 Grandis Scissor unsuspends a Digimon "with [Insectoid] in its traits" and makes
//     it attack again: the cross-card consequence of the [Rule] trait line, and the only
//     public way to reach a SECOND battle in the same turn for the once-per-turn proof.
//
// The KB has no Q&A entries for BT19-052 (`node tools/kb/query.mjs card BT19-052` ->
// "(no knowledge-base entries)"), so this suite is driven by the printed text alone.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014", "BT1-027", "BT1-028"];

describe("BT19-052 Vespamon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-052")).toMatchObject({
      cardId: "BT19-052",
      nameEn: "Vespamon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, trash their top security card.",
    });
    // The catalog printing uses U+00A0 in a few places; normalise it for the clause checks.
    const printed = getCardDefinition("BT19-052")!.effectText!.replace(/\u00a0/g, " ");
    expect(printed).toContain("[Digivolve]Lv.4 w/[Royal Base] trait: Cost 3");
    expect(printed).toContain("[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Blocker＞");
    expect(printed).toContain(
      "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 2 or less. For each of your face-up security cards, add 2 to this effect's maximum play cost.",
    );
    expect(printed).toContain("[Rule] Trait: Has the [Insectoid] type.");
    expect(digivolutionRequirementsFor("BT19-052")).toContainEqual({
      level: 4,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    });
  });

  it("digivolves from a Lv.4 [Royal Base] source for 3 through the printed alternate route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-046", as: "waspmon", under: ["BT18-044"] }],
        hand: [{ card: "BT19-052", as: "vespa" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();
    const waspmonId = s.inst("waspmon").instanceId;
    const funbeemonId = s.perm("waspmon").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("waspmon").permanentId,
        instanceId: s.inst("vespa").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("waspmon").topCard?.cardId === "BT19-052");

    // Cost 3, not the printed colour route's 4.
    expect(s.state.memory).toBe(2);
    expect(s.perm("waspmon").stack.map((card) => card.instanceId)).toEqual([funbeemonId, waspmonId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(inertDeck);
    assertNoLoudGap(s);
  });

  it("refuses the [Royal Base] route for a Green Lv.4 near miss, which still digivolves by colour for 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-073", as: "kabuterimon" }],
        hand: [{ card: "BT19-052", as: "vespa" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();

    // BT1-073 Kabuterimon is Green, Lv.4 and [Insectoid] — everything the route wants except
    // the [Royal Base] trait, so the cost-3 route is refused outright.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kabuterimon").permanentId,
        instanceId: s.inst("vespa").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);

    // The printed Green Lv.4 route is still open, and costs 4 rather than the route's 3.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kabuterimon").permanentId,
        instanceId: s.inst("vespa").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").topCard?.cardId === "BT19-052");

    expect(s.state.memory).toBe(1);
    expect(s.perm("kabuterimon").stack.map((card) => card.cardId)).toEqual(["BT1-073"]);
    assertNoLoudGap(s);
  });

  it("refuses an illegal source: a Red Lv.4 without the [Royal Base] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "kokatorimon" }],
        hand: [{ card: "BT19-052", as: "vespa" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kokatorimon").permanentId,
        instanceId: s.inst("vespa").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
    await settle();

    expect(s.perm("kokatorimon").topCard?.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-052"]);
  });

  it("grants ＜Blocker＞ from face-up security to [Royal Base] Digimon only, and only on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-045", as: "royal" },
            { card: "BT1-066", as: "nearMiss" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [{ card: "BT19-052", faceUp: true }, ...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // My own turn: the clause is [Opponent's Turn], so nothing is granted yet.
    expect(observe(s.engine).hasKeyword(s.perm("royal"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nearMiss"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("royal"), "Blocker")).toBe(true);
    // Near miss: [Insectoid], Green, but no [Royal Base] trait.
    expect(observe(s.engine).hasKeyword(s.perm("nearMiss"), "Blocker")).toBe(false);

    // The rules consequence, not the flag: the opponent attacks me and only the Royal Base
    // Digimon may declare the block.
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined || s.perm("attacker").isSuspended);

    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("nearMiss").permanentId }).ok,
    ).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("royal").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-045"));

    // The block happened: FunBeemon (1000 DP) took the 4000 DP attack instead of my security.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-066"]);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants nothing while the same card sits FACE DOWN in security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-045", as: "royal" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: ["BT19-052", ...inertSecurity],
        },
        1: {
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("royal"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    [0, "BT1-009", 2, "BT1-013", 3],
    [1, "BT1-071", 4, "BT1-020", 5],
    [2, "BT1-019", 6, "BT1-024", 7],
  ] as const)(
    "On Play with %i face-up security cards deletes at play cost %s(%i) but spares %s(%i)",
    async (faceUpCount, targetId, _targetCost, overId, _overCost) => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT19-052", as: "vespa" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: inertDeck,
            security: [
              ...Array.from({ length: faceUpCount }, () => ({ card: "BT1-009", faceUp: true })),
              ...inertSecurity,
            ],
          },
          1: {
            battleArea: [
              { card: targetId, as: "target" },
              { card: overId, as: "over" },
            ],
            deck: inertDeck,
            security: inertSecurity,
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
      );
      preferInstanceIds.push(s.perm("target").topCard!.instanceId);
      await s.ready();
      const targetPermanentId = s.perm("target").permanentId;
      const overPermanentId = s.perm("over").permanentId;

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 8;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vespa").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.length === 1);

      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([overPermanentId]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([targetId]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-052"]);
      expect(s.state.memory).toBe(0);
      expect(targetPermanentId).not.toBe(overPermanentId);
      assertNoLoudGap(s);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("When Digivolving uses the same face-up-security ceiling", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-046", as: "waspmon", under: ["BT18-044"] }],
          hand: [{ card: "BT19-052", as: "vespa" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
          security: [{ card: "BT1-009", faceUp: true }, ...inertSecurity],
        },
        1: {
          battleArea: [
            { card: "BT1-071", as: "target" },
            { card: "BT1-020", as: "over" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 5;
    await s.ready();
    const overPermanentId = s.perm("over").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("waspmon").permanentId,
        instanceId: s.inst("vespa").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // Ceiling 2 + 1 face-up card * 2 = 4: Vegiemon (4) goes, Groundramon (5) stays.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([overPermanentId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-071"]);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("has the [Insectoid] type for another card's exact-trait filter", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-052", as: "vespa", suspended: true },
            { card: "BT1-013", as: "notInsectoid", suspended: true },
          ],
          hand: [
            { card: "BT9-100", as: "scissor" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "prey" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("vespa").topCard!.instanceId, s.perm("prey").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // A permanent seeded suspended stands up in my own unsuspend phase; re-suspend both so
    // BT9-100's "unsuspend 1 of your [Insectoid] Digimon" has a real choice to make.
    s.perm("vespa").isSuspended = true;
    s.perm("notInsectoid").isSuspended = true;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scissor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // Only the [Insectoid] Digimon could be unsuspended and forced to attack; Muchomon,
    // which has no [Insectoid] type, was never a candidate.
    expect(s.perm("notInsectoid").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("as a digivolution card trashes the opponent's top security once per turn, and again next turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen", under: ["BT18-044", "BT18-046", "BT19-052"] }],
          hand: [
            { card: "BT9-100", as: "scissor" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          // 2000 DP on top so the opponent's 3000 DP attacker survives its security check
          // and stays suspended for my next turn.
          security: ["BT1-012", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "prey1", suspended: true },
            { card: "BT1-009", as: "prey2", suspended: true },
            { card: "BT1-009", as: "prey3", suspended: true },
            { card: "BT1-009", as: "prey4", suspended: true },
          ],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: inertDeck,
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("prey1").topCard!.instanceId);
    await s.ready();
    const topSecurityId = s.state.players[1]!.security[0]!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // First battle deletion of the turn: the inherited clause trashes their top security.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "permanent", permanentId: s.perm("prey1").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 3);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(topSecurityId);

    // A second battle deletion in the SAME turn, reached publicly through BT9-100.
    preferInstanceIds.length = 0;
    preferInstanceIds.push(s.perm("queen").topCard!.instanceId, s.perm("prey2").topCard!.instanceId);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scissor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    // The survivor stood up in their own unsuspend phase; make it attack me so it is
    // suspended again — and therefore a legal attack target — on my next turn.
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    const survivorId = s.state.players[1]!.battleArea[0]!.permanentId;
    const survivor = () => s.state.players[1]!.battleArea.find((p) => p.permanentId === survivorId)!;
    expect(survivor().isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: survivorId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => survivor().isSuspended);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // My next turn: the once-per-turn budget is back.
    await advance(s.engine).waitForMainPhase(0);
    expect(survivor().isSuspended).toBe(true);
    expect(s.perm("queen").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "permanent", permanentId: survivorId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < 2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
