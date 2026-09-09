import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-076.js";

// BT19-076 Luminamon — White / Lv.5 / play cost 5 / DP 4000 / [Fairy] [Xros Heart].
// Printed clauses:
//   1. [Digivolve][Shademon]: Cost 2
//   2. [On Play] Reveal top 3 cards of your deck. Add 1 card with the
//      [Xros Heart]/[Blue Flare]/[Twilight] trait from among to your hand. Return the
//      remaining to the bottom of deck. Then, you may play 1 Tamer card with a play cost
//      of 4 or less from your hand without paying the cost.
//   3. [On Deletion] ＜Save＞.
//
// KB: `node tools/kb/query.mjs card BT19-076` reports no knowledge-base entries, matching
// KB-INDEX.md (0 Q&A). ＜Save＞ is therefore proved against comprehensive 16-20-3 / CR 4-3-2
// instead of a card ruling.
//
// White / level-less rules read for this lane (comprehensive 2-4-2, 2-9-2): White is one of
// the seven ordinary colors and carries no special play rule; only cards with no level (or
// "Lv.-") are treated as having no level. BT19-076 IS a printed Lv.5 Digimon, so it plays
// and digivolves under the ordinary rules; the level-less handling matters for BT19-077 and
// BT19-078 in this lane, not here.

describe("BT19-076 Luminamon", () => {
  it("compiles the exact-name digivolve route, the reveal/add chain, and a real ＜Save＞ placement", () => {
    const card = runtimeCompiledCard("BT19-076");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    // "[Digivolve][Shademon]" is a bracketed EXACT name route: `namesExact`, not the
    // substring `names` gate.
    expect(card?.digivolutionRequirement).toEqual([{ namesExact: ["Shademon"], cost: 2, isAlternate: true }]);
    expect(card?.effects.find((e) => e.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          {
            count: 1,
            to: "hand",
            filter: { nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare", "Twilight"], match: "trait" }] },
          },
        ],
      },
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { filter: { kind: ["Tamer"], playCostLte: 4 } },
      },
    ]);
    // ＜Save＞ needs a real placement action; the keyword alone did nothing. The keyword makes
    // the registration normalizer default the position to the stack BOTTOM (CR 4-3-2).
    const onDeletion = card?.effects.find((e) => e.trigger === "OnDeletion");
    expect(onDeletion?.keywords).toMatchObject([{ keyword: "Save" }]);
    expect(onDeletion?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        position: "bottom",
        optional: true,
        target: { isSelf: true },
        underFilter: { controller: "mine", kind: ["Tamer"] },
      },
    ]);
  });

  // ---------------------------------------------------------------------------
  // [On Play] — reveal 3, add 1 by trait, rest to deck bottom, then the free Tamer
  // ---------------------------------------------------------------------------

  it("adds the trait match, bottoms the rest in order, and plays a cost-4-or-less Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "cheapTamer" },
            { card: "BT13-095", as: "pricyTamer" },
          ],
          // Top of deck first. BT10-058 Monitamon carries [Twilight]/[Xros Heart];
          // BT1-012 Biyomon [Bird] and BT1-013 Muchomon [Avian] are the near misses.
          deck: ["BT10-058", "BT1-012", "BT1-013", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lumina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-081"));
    await settle(() => false, 30);

    // Play cost 5 paid once; the Tamer arrived "without paying the cost", so memory never
    // moves for it (10 - 5 = 5, not 5 - 3 = 2).
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId).sort()).toEqual(["BT19-076", "BT19-081"]);
    // The [Twilight]/[Xros Heart] card is in hand; the over-cost Tamer never left it.
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT10-058", "BT13-095"]);
    // "Return the remaining to the bottom of deck": the two non-matching reveals sit under
    // the untouched rest of the deck, in reveal order.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-012", "BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("adds nothing when none of the 3 reveals carries the trait and bottoms all three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "cheapTamer" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lumina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-081"));
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-011",
      "BT1-009",
      "BT1-012",
      "BT1-013",
      "BT1-010",
    ]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("leaves the Tamer in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "cheapTamer" },
          ],
          deck: ["BT10-058", "BT1-012", "BT1-013", "BT1-010"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      // The reveal/add is mandatory, so the only optional in this effect is the Tamer play:
      // a blanket decline cannot answer the wrong prompt here.
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lumina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-058"));
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT10-058", "BT19-081"]);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT19-076"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [Digivolve][Shademon]: Cost 2 — the card's only printed digivolution route
  // ---------------------------------------------------------------------------

  it("digivolves from a [Shademon] base for cost 2, keeping the source under it and drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-068", as: "base" }],
          hand: [{ card: "BT19-076", as: "lumina" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    const luminaInstanceId = s.inst("lumina").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: luminaInstanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === luminaInstanceId);
    await settle(() => false, 30);

    // Cost 2, not a normal-route cost: the memory delta is what discriminates the route.
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(4000);
    // Digivolution bonus draw.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    // Digivolving is not playing: the [On Play] reveal never ran.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also accepts the other printing that prints the exact name [Shademon] but refuses an unrelated Lv.4 base", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-065", as: "otherShademon" },
            { card: "BT1-014", as: "nearMiss" },
          ],
          hand: [
            { card: "BT19-076", as: "luminaA" },
            { card: "BT19-076", as: "luminaB" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    // BT1-014 Kokatorimon is a Lv.4 base with no name match; the catalog prints no primary
    // digivolution requirement for BT19-076, so no route at all exists onto it.
    const refused = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("nearMiss").permanentId,
      instanceId: s.inst("luminaA").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 0,
    });
    expect(refused.ok).toBe(false);

    // A second printing whose printed name is exactly [Shademon] still qualifies.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("otherShademon").permanentId,
        instanceId: s.inst("luminaB").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherShademon").topCard?.cardId === "BT19-076");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-076", "BT1-010"]);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ＜Save＞ — comprehensive 16-20-3, placement position CR 4-3-2
  // ---------------------------------------------------------------------------

  it("＜Save＞s itself to the bottom of a Tamer's stack after losing a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "tamer", under: [{ card: "BT1-011", as: "older" }] },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        // A suspended 5000 DP wall: attacking it deletes the 4000 DP Luminamon in battle.
        1: { battleArea: [{ card: "BT1-013", as: "wall", suspended: true }], security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const luminaInstanceId = s.inst("lumina").instanceId;
    const olderInstanceId = s.inst("older").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lumina").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("tamer").stack.length === 2);
    await settle(() => false, 30);

    // CR 4-3-2: a ＜Save＞d card goes to the BOTTOM of the Tamer's stack. `stack` is bottom-first.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([luminaInstanceId, olderInstanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT19-081"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("goes to the trash instead when its controller has no Tamer to ＜Save＞ under", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-076", as: "lumina" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        // The opponent's Tamer is not a legal ＜Save＞ host: the placement is "your Tamers".
        1: {
          battleArea: [
            { card: "BT1-013", as: "wall", suspended: true },
            { card: "BT19-081", as: "opponentTamer" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const luminaInstanceId = s.inst("lumina").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lumina").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === luminaInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([luminaInstanceId]);
    expect(s.perm("opponentTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
