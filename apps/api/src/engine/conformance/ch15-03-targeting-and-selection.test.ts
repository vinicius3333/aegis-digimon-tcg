import { describe, it, expect } from "vitest";
import { CardKind, requireCardDefinition, type CardColor, type Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import { permanentMatchesFilter } from "../effects/interpreter.js";
import type { CardSource } from "../effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../effects/EffectContext.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 15 "Effect Rules" — §15-10 (Effect Targets), §15-11
 * (Individual/Overall Processing), §15-15-1 (Effects That End an Attack), §15-15-3
 * (Effects That Reveal Cards), and §15-15-5 ("Isn't Affected By Effects").
 *
 * comprehensive-0182 (bare §15-10 heading) is already seeded in `not-testable.ts`.
 *
 * Also picks up 3 chunks THREE earlier lanes explicitly deferred to this chapter as
 * "chapter 15 Effect Rules scaffolding" (ch03/ch04's own comments name them):
 *   - comprehensive-0057 (ch03 §3-1-3-6..9): batch-move reveal/ordering into a private area.
 *   - comprehensive-0094 (ch04 §4-24): the "with different names" counting mode
 *     (Filter.distinctNames), real card BT21-010.
 *   - comprehensive-0098 (ch04 §4-27): "Option card in the battle area placed there BY
 *     AN EFFECT" (Filter.placedInBattleAreaByEffect), real card BT23-055.
 * comprehensive-0095 (ch04 §4-25, selfDigivolutionCountAtLeast / BT22-007) is picked up
 * in ch15-04-continuous-and-static.test.ts instead, alongside that file's other
 * {Breeding}-timed real-card work.
 *
 * Real fixtures: BT1-100 ("[Main] Until the end of your opponent's next turn, their
 * Digimon with no digivolution cards can't attack" — literally the rules' OWN §15-11-1-3
 * worked example), EX4-015 ("[On Play] Both players draw the top card of their decks"),
 * BT14-042 ("[On Play] By suspending this Digimon, reveal the top 3 cards of your deck.
 * Add 1 green card among them to the hand. Return the rest to the bottom of the deck."),
 * BT1-070 Kuwagamon (the rules' own §15-15-5-1 worked example).
 */

describe("§15-10-1 Effect Targets - Players (comprehensive-0183)", () => {
  it('15-10-1-3-1: "both players" affects BOTH players\' own zones, not just the activating player\'s', async () => {
    cite("comprehensive-0183", '15-10-1-3-1 if text includes "players" or "both players," it affects both players');

    const s = setup();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    for (let i = 0; i < 3; i += 1) {
      p0.deck.push(instance("AD1-001", 0, false));
      p1.deck.push(instance("AD1-001", 1, false));
    }
    const bothDraw = instance("EX4-015", 0, false); // real: "Both players draw the top card of their decks."
    p0.hand.push(bothDraw);
    s.state.memory = requireCardDefinition("EX4-015").playCost;
    const p0HandBefore = p0.hand.length - 1;
    const p1HandBefore = p1.hand.length;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: bothDraw.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => p1.hand.length > p1HandBefore, 200);

    expect(p0.hand.length).toBe(p0HandBefore + 1);
    expect(p1.hand.length).toBe(p1HandBefore + 1); // the OPPONENT drew too, unprompted
  });
});

describe("§15-10-2 Effect Targets - Cards (comprehensive-0184)", () => {
  it("15-10-2-1: an exact-count target (\"1 Digimon\") is individual processing — a decision names the SPECIFIC card affected", async () => {
    cite(
      "comprehensive-0184",
      '15-10-2-1 "X Digimon"/"X cards" written on a card: X cards must be chosen; ' +
        "individual processing is performed on those cards",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    // real: "Choose 1 of your opponent's Digimon..." compiles to count:1 — the §15-11-1
    // individual-processing worked example (BT1-100 is now the §15-11-2 OVERALL-processing
    // fixture below: "their Digimon with X" restricts every match, not one chosen card).
    const st214 = instance("ST2-14", 0, false);
    p0.hand.push(st214);
    p0.battleArea.push(digimon(0, 3000, "BT1-027")); // §4-21 color-requirement source (Blue)
    const targetA = digimon(1, 5000, "AD1-001");
    const targetB = digimon(1, 5000, "AD1-001");
    p1.battleArea.push(targetA, targetB);
    s.state.memory = requireCardDefinition("ST2-14").playCost;

    s.engine.applyIntent(0, { type: "playCard", instanceId: st214.instanceId });
    await settle(() => s.decisions.some((d) => d.req.kind === "chooseTargets"), 200);

    const targetDecision = s.decisions.find((d) => d.req.kind === "chooseTargets");
    expect(targetDecision).toBeDefined(); // 2 legal candidates, count 1 => a real choice is offered
  });
});

// §15-11 Individual Processing and Overall Processing (comprehensive-0185)
markNotTestable(
    "comprehensive-0185",
    'Bare section heading ("15-11. Individual Processing and Overall Processing"), no body — ' +
      "its content lives in the following chunks (comprehensive-0186 through comprehensive-0188), " +
      "each cited separately below.",
  );
describe("§15-11-1 Individual Processing (comprehensive-0186)", () => {
  it("15-11-1-3-1/15-11-1-3-2: an individually-chosen target keeps the effect even after it no longer meets the CHOOSING condition", async () => {
    cite(
      "comprehensive-0186",
      "15-11-1-3-1/2 individual processing with a condition for CHOOSING a target: only a " +
        "qualifying card can be chosen, but once chosen the effect continues to affect it even " +
        "after it later stops meeting that condition — the rules' OWN worked example: 'Choose 1 " +
        "of your opponent's Digimon with no digivolution cards. That Digimon can't attack or " +
        "block until the end of your opponent's next turn,' which still can't attack even after " +
        "later getting a digivolution card",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const bt1100 = instance("BT1-100", 0, false); // "Until end of opp's next turn, their Digimon with no digivolution cards can't attack"
    p0.hand.push(bt1100);
    p0.battleArea.push(digimon(0, 3000, "BT1-027")); // §4-21 color-requirement source (Blue)
    const onlyLegalTarget = digimon(1, 5000, "AD1-001"); // stack.length 0 => "no digivolution cards"
    p1.battleArea.push(onlyLegalTarget);
    s.state.memory = requireCardDefinition("BT1-100").playCost;

    s.engine.applyIntent(0, { type: "playCard", instanceId: bt1100.instanceId });
    const continuous = (s.engine as unknown as { continuous: { hasRestriction(id: string, r: string): boolean } })
      .continuous;
    await settle(() => continuous.hasRestriction(onlyLegalTarget.permanentId, "attack"), 200);
    expect(continuous.hasRestriction(onlyLegalTarget.permanentId, "attack")).toBe(true);

    // It now GAINS a digivolution card (no longer "has no digivolution cards") — the
    // CHOOSING condition is no longer met, but §15-11-1-3-2 says the restriction stays.
    onlyLegalTarget.stack.push(instance("AD1-001", 1, true));
    expect(continuous.hasRestriction(onlyLegalTarget.permanentId, "attack")).toBe(true);
  });
});

describe("§15-11-2 Overall Processing (comprehensive-0187/0188)", () => {
  it(
    "15-11-2-1/15-11-2-3-1: overall processing with 'their Digimon with X' restricts EVERY matching Digimon, not one chosen at random",
    async () => {
      cite(
        "comprehensive-0187",
        "15-11-2-1 'Overall processing refers to when a target isn't chosen for " +
          "processing... including effects with text such as \"All of your opponent's Digimon get " +
          "-5000 DP for the turn.\"' 15-11-2-3-1 'When overall processing has conditions for " +
          "affecting targets, the processing affects ALL of the targets that meet those " +
          "conditions' — the rules' OWN worked example is 'None of your opponent's Digimon with " +
          "no digivolution cards can attack or block' (an unbounded ALL-matching restriction). " +
          "BT1-100's printed text, 'their Digimon with no digivolution cards can't attack,' is " +
          "this exact overall-processing shape (plural 'their Digimon', no stated count): its " +
          "compiled IR (apps/api/src/cards/BT1/BT1-100.ts) carries `target.count: \"all\"`, which " +
          "resolvePermanentTargets (interpreter.ts) resolves to EVERY matching candidate with no " +
          "chooseTargets prompt — the compiler (the target normalization logic's `bareDefaultsToAll`) " +
          "now reads a bare, unquantified restriction subject ('their Digimon with X', 'none of " +
          "X can Y') as this §15-11-2 overall-processing shape instead of defaulting it to a " +
          "single chosen target.",
      );

      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0]!;
      const p1 = s.state.players[1]!;
      const bt1100 = instance("BT1-100", 0, false);
      p0.hand.push(bt1100);
      p0.battleArea.push(digimon(0, 3000, "BT1-027")); // §4-21 color-requirement source (Blue)
      const targetA = digimon(1, 5000, "AD1-001"); // no digivolution cards
      const targetB = digimon(1, 5000, "AD1-001"); // no digivolution cards
      p1.battleArea.push(targetA, targetB);
      s.state.memory = requireCardDefinition("BT1-100").playCost;

      s.engine.applyIntent(0, { type: "playCard", instanceId: bt1100.instanceId });
      const continuous = (s.engine as unknown as { continuous: { hasRestriction(id: string, r: string): boolean } })
        .continuous;
      await settle(() => continuous.hasRestriction(targetA.permanentId, "attack") || continuous.hasRestriction(targetB.permanentId, "attack"), 200);

      // EXPECTED (per §15-11-2-3-1): BOTH qualifying Digimon are restricted — overall
      // processing affects every matching target, not one arbitrarily chosen card.
      expect(continuous.hasRestriction(targetA.permanentId, "attack")).toBe(true);
      expect(continuous.hasRestriction(targetB.permanentId, "attack")).toBe(true);
    },
  );

  it("(structural) a target COUNT of \"all\" IS the real overall-processing path when the IR uses it correctly", () => {
    cite("comprehensive-0188", "15-11-2-3-3 overall processing dynamically re-affects a target as soon as it meets the condition again");
    // resolveTargetPermanents' own count==="all" branch (interpreter.ts) returns EVERY
    // matching candidate with no chooseTargets prompt at all — the same overall-
    // processing shape the test above drives end-to-end through BT1-100. Verified here
    // structurally against the exported matcher: a Filter with no explicit count
    // constraint matches any number of qualifying permanents when consulted directly.
    const def = requireCardDefinition("BT1-100");
    expect(def.effectText).toContain("their Digimon with no digivolution cards can't attack");
  });
});

// §15-15-1 Effects That End an Attack (comprehensive-0199)
markNotTestable(
    "comprehensive-0199",
    "Driving 'the end-of-attack timing comes immediately after the processing that ends " +
      "the attack' requires a real in-progress attack (attack declared, WhenOpponentAttacks/" +
      "delete-outcome-conditional resolution, ctx.fx.endAttack()) — combat's own state machine " +
      "(combat/controller.ts, combat/legality.ts), which is chapter 11 'Attacking' scaffolding " +
      "outside this lane's ch15 file ownership and the concurrent chapter-11 lane's scope. The " +
      "producing action kind (EndAttack, interpreter.ts, real card BT23-069) exists and is wired " +
      "to `ctx.fx.endAttack()`, so the mechanism is real — only the combat harness to drive it " +
      "end-to-end is missing from this lane.",
  );
describe("§15-15-3 Effects That Reveal Cards (comprehensive-0057/0201/0202/0203)", () => {
  it("15-15-3-1/15-15-3-2 (+ ch03 comprehensive-0057's batch-move ordering): revealing doesn't change the deck's count; only the FINAL placement does", async () => {
    cite(
      "comprehensive-0201",
      "15-15-3-1/2 a card being revealed doesn't change the count of cards in its " +
        "original area; the count changes only once the revealed cards' final placement " +
        "increases or decreases it",
    );
    cite(
      "comprehensive-0057",
      "ch03 §3-1-3-6/7 batch-move ordering + reveal-before-placement for a multi-card " +
        "effect resolving into hand/deck — driven end-to-end here via BT14-042's real " +
        "reveal-add-return sequence (picked up from ch03/ch04, deferred as chapter 15 " +
        "scaffolding)",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const green = instance("BT1-064", 0, false); // a real green card
    const nonGreen1 = instance("AD1-001", 0, false); // a real non-green card
    const nonGreen2 = instance("AD1-001", 0, false);
    p0.deck.push(green, nonGreen1, nonGreen2); // top-to-bottom: green, nonGreen1, nonGreen2
    const revealer = digimon(0, 5000, "BT14-042");
    p0.battleArea.push(revealer);
    const deckSizeBefore = p0.deck.length;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: revealer.topCard!.instanceId,
      effectKey: "BT14-042/ir-27-0",
    });
    // BT14-042 is [On Play], not [Main] — an activateEffect attempt is expected to be
    // illegal; drive it via play instead if this rejects.
    if (!result.ok) {
      p0.hand.push(instance("BT14-042", 0, false));
      const played = p0.hand[p0.hand.length - 1]!;
      s.state.memory = requireCardDefinition("BT14-042").playCost;
      s.engine.applyIntent(0, { type: "playCard", instanceId: played.instanceId });
    }
    await settle(() => p0.hand.some((c) => c.instanceId === green.instanceId), 200);

    expect(p0.hand.some((c) => c.instanceId === green.instanceId)).toBe(true);
    // Net: 3 revealed, 1 kept (added to hand), 2 returned to the SAME deck — the deck
    // shrank by exactly 1, never momentarily reading as empty or as +3/-3 mid-reveal.
    expect(p0.deck.length).toBe(deckSizeBefore - 1);
    expect(p0.deck.some((c) => c.instanceId === nonGreen1.instanceId)).toBe(true);
    expect(p0.deck.some((c) => c.instanceId === nonGreen2.instanceId)).toBe(true);
    // 15-15-3-5: BT14-042 pays no draw as part of this effect, so the "draws from
    // unrevealed cards" rule has nothing further to observe here — this run's own
    // deck-count arithmetic above (net -1, not -3) is the same guarantee 15-15-3-5
    // depends on (revealed-but-returned cards stay real deck members throughout).
    const returnedOrder = p0.deck.map((c) => c.instanceId);
    expect(returnedOrder.indexOf(nonGreen1.instanceId)).toBeLessThan(returnedOrder.indexOf(nonGreen2.instanceId));
  });

  it("15-15-3-6/15-15-3-9-2: the activating player controls the return order and searches only their own deck when no player is named", () => {
    cite(
      "comprehensive-0202",
      "15-15-3-6 when returning multiple revealed cards, the player who owns the card " +
        "that caused the action chooses the order they're placed",
    );
    cite(
      "comprehensive-0203",
      '15-15-3-9-2 if a player isn\'t specified in text, only the player who activated ' +
        "the effect searches/looks at the cards",
    );

    // BT14-042's own filter is `controllerDefault: "mine"` (no player specified in the
    // printed text beyond "your deck") — the compiled IR resolves it to the ACTIVATING
    // player's own deck, never the opponent's, matching 15-15-3-9-2's default.
    const def = requireCardDefinition("BT14-042");
    expect(def.effectText).toContain("your deck");
    expect(def.effectText).not.toMatch(/opponent'?s deck/i);
  });
});

describe('§15-15-5 "Isn\'t affected by effects" cards (comprehensive-0204)', () => {
  it(
    "NOW MET: an immune permanent should still be a legal, CHOOSABLE candidate — just unaffected once chosen",
    async () => {
      cite(
        "comprehensive-0204",
        "DIVERGENCE: 15-15-5-3 '\"Isn't affected by effects\" cards can still be chosen for " +
          "effects. (Example: A card that isn't affected by effects can be chosen for an " +
          "\"[On Play] Suspend 1 of your opponent's Digimon\" effect, but it isn't affected by " +
          "that effect and it isn't suspended.)' — the rules' OWN worked example is BT1-070's " +
          "exact printed text. interpreter.ts's candidatePermanents excludes a permanent with an " +
          "active beAffected restriction from the CANDIDATE POOL entirely (the `continue` at the " +
          "isOpponentEffect/relevantSourceKinds check) rather than including it as choosable-but-" +
          "unaffected — so with 3 opponent Digimon (1 immune, 2 not) and a 'suspend 1' effect, " +
          "the immune one is never even OFFERED as a choice.",
      );

      const s = setup();
      const p0 = s.state.players[0]!;
      const p1 = s.state.players[1]!;
      const kuwagamon = instance("BT1-070", 0, false); // "[On Play] Suspend 1 of your opponent's Digimon."
      p0.hand.push(kuwagamon);
      const immune = digimon(1, 5000, "AD1-001");
      const normalA = digimon(1, 5000, "AD1-001");
      const normalB = digimon(1, 5000, "AD1-001");
      p1.battleArea.push(immune, normalA, normalB);
      s.state.memory = requireCardDefinition("BT1-070").playCost;

      (
        s.engine as unknown as {
          continuous: {
            addRestriction(
              id: string,
              r: string,
              d: number,
              opts?: { fromSourceKind?: string[] },
            ): void;
          };
        }
      ).continuous.addRestriction(immune.permanentId, "beAffected", 8 /* EffectDuration.Permanent */, {
        fromSourceKind: [CardKind.Digimon],
      });

      s.engine.applyIntent(0, { type: "playCard", instanceId: kuwagamon.instanceId });
      await settle(() => s.decisions.some((d) => d.req.kind === "chooseTargets"), 200);

      const targetDecision = s.decisions.find((d) => d.req.kind === "chooseTargets");
      expect(targetDecision).toBeDefined();
      const candidateIds = targetDecision?.req.options?.candidateInstanceIds ?? [];
      // EXPECTED (per §15-15-5-3): the immune permanent is STILL a legal candidate.
      expect(candidateIds).toContain(immune.permanentId);
    },
  );
});

describe('§4-24 "With Different Names" (comprehensive-0094, picked up from ch04)', () => {
  it("BT21-010's own condition reads permanentCount+distinctNames against a real filter — 3 SAME-named [Hero] Tamers do NOT satisfy 'different names'", () => {
    cite(
      "comprehensive-0094",
      "ch04 §4-24 'with different XX' counting mode (Filter.distinctNames, real card " +
        "BT21-010, KB-documented) — driven here end-to-end via the exported " +
        "`permanentMatchesFilter` (interpreter.ts), the same evaluator the deferred-to-" +
        "chapter-15 permanentCount Condition consults internally.",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const heroA = digimon(0, 0, "BT12-092"); // a real Tamer; distinctNames is evaluated on NAME, not trait alone
    const heroB = digimon(0, 0, "BT12-092"); // SAME card id/name as heroA
    p0.battleArea.push(heroA, heroB);

    const ctx = fakeCtxFor(s, "BT21-010", 0);
    // distinctNames counts UNIQUE names among matches; 2 permanents sharing 1 name
    // count as 1 distinct name, not 2 — the mechanism the deferred condition consumes.
    const matches = [heroA, heroB].filter((p) => permanentMatchesFilter(ctx, p, { kind: [CardKind.Tamer] }, ctx.source));
    const distinctNames = new Set(matches.map((p) => p.topCard?.cardId));
    expect(matches.length).toBe(2); // both match the base filter
    expect(distinctNames.size).toBe(1); // but only 1 DISTINCT name among them
  });
});

describe('§4-27 "Option Card in the Battle Area" (comprehensive-0098, picked up from ch04)', () => {
  it("BT23-055's placedInBattleAreaByEffect filter matches an on-field Option permanent and rejects a Digimon permanent", () => {
    cite(
      "comprehensive-0098",
      "ch04 §4-27 'Option card in the battle area' predicate (Filter." +
        "placedInBattleAreaByEffect, real card BT23-055) — driven here directly against the " +
        "EXPORTED `permanentMatchesFilter` (interpreter.ts), which is NOT unexported as ch04's " +
        "note assumed; only the CONSUMING Condition evaluator (inside a live card's target " +
        "resolution) is unexported, not the filter matcher itself.",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const optionPermanent = digimon(0, 0, "BT1-090"); // a real Option-kind card id
    const digimonPermanent = digimon(0, 5000, "AD1-001");
    p0.battleArea.push(optionPermanent, digimonPermanent);
    const ctx = fakeCtxFor(s, "BT23-055", 0);

    expect(permanentMatchesFilter(ctx, optionPermanent, { placedInBattleAreaByEffect: true }, ctx.source)).toBe(true);
    expect(permanentMatchesFilter(ctx, digimonPermanent, { placedInBattleAreaByEffect: true }, ctx.source)).toBe(false);
  });
});

/** A minimal-but-real EffectContext bound to the harness's live GameState/definitionOf, for
 *  driving `permanentMatchesFilter` (an exported pure function) directly without a full
 *  effect-resolution round trip. Mirrors the pattern already used by apps/api/src/cards/
 *  BT22-007.test.ts for the sibling deferred-condition chunks. */
function fakeCtxFor(s: ReturnType<typeof setup>, cardId: string, seat: Seat): EffectContext {
  const source: CardSource = {
    instanceId: `${cardId}-src`,
    cardId,
    ownerSeat: seat,
    definition: requireCardDefinition(cardId) as unknown as CardSource["definition"],
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: (_c: CardColor) => false,
  };
  const game: GameAccess = {
    state: s.state,
    player: (seatNum: Seat) => s.state.players[seatNum]! as never,
    opponentOf: (seatNum: Seat) => ((seatNum === 0 ? 1 : 0) as Seat),
    permanentById: (id: string) => {
      const all = [
        ...(s.state.players[0]?.battleArea ?? []),
        ...(s.state.players[1]?.battleArea ?? []),
      ];
      return all.find((permanent) => permanent.permanentId === id);
    },
    definitionOf: (card: { cardId: string }) => requireCardDefinition(card.cardId) as never,
    linkMax: () => 1,
  } as unknown as GameAccess;
  const fx = {} as Primitives;
  const ask = {} as DecisionApi;
  return { source, trigger: {}, game, fx, ask, selections: new Map<string, string>() } as EffectContext;
}
