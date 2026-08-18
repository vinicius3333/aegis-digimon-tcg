import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Phase, Zone, requireCardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import {
  setupEngine as setup,
  makeInstance as instance,
} from "../testkit/harness.js";
import { applyMoveFromBreeding, applyHatchEgg } from "../actions/breeding.js";
import "../../cards/index.js";

/**
 * Official Rule Manual chunks manual-0000..manual-0016 — "About the Game" / Card
 * Information / Game Areas / Decks / Game Preparation / Turn Procedures A-D (Play a
 * Digimon or Tamer, Digivolve, Use an Option, Link).
 *
 * See `README.md` for the citation contract and this project's `AGENTS.md` for why
 * the manual is scraped from an image-only PDF via OCR and is noisier than the
 * Comprehensive Rules (garbled words, run-together lines, section numbers that don't
 * line up with the Comprehensive Rules' own numbering).
 *
 * Chapters 1-18 (comprehensive-*) already carry deep behavioral coverage of every
 * mechanic the manual restates in this range (card info: ch02, game areas: ch03,
 * decks/prep: ch01/ch05, turn procedures/digivolution/options/linking: ch04/ch06/
 * ch08/ch09/ch10). Per the lane brief, the default move for a manual chunk that only
 * restates already-covered ground is a short cross-referencing not-testable entry
 * naming the comprehensive chunk/chapter file that already proves the behavior — NOT
 * a duplicate test. The exceptions below are genuine new value: either the manual's
 * own worked example exercises a code path chapters 1-18 don't already drive, or
 * following the manual's OWN restated rule surfaced an engine bug nobody had
 * documented yet.
 */

markNotTestable(
  "manual-0000",
  "Table of contents + 'About the Game' flavor intro. The one normative sentence " +
    "('Digi-Egg cards and Digimon cards are treated as Digimon while on the field') " +
    "restates comprehensive-0069, already behaviorally proven at ch04-basic-terminology" +
    ".test.ts §4-2 (comprehensive-0069, 4-2-1).",
);

markNotTestable(
  "manual-0001",
  "OCR-DAMAGED: this chunk interleaves a card-anatomy diagram's callout labels with " +
    "unrelated printed card text from two different real cards, mid-sentence, e.g. " +
    "'wins. During battles, the Digimon with the higher DP Lv.2 • •Digivolution " +
    "Requirements: The requirements to be able to digivolve into this card and the " +
    "digivolution cost. - •Effects: Special abilities the card possesses. - •Card " +
    "Name •Color: The 7 colors include red, blue, yellow, green, black, purple, and " +
    "white.' and 'iercing (When this Digimon deletes your ...ment's Digimon in hattle " +
    "while attaddina' (broken mid-word by a figure caption). The identifiable normative " +
    "fragments (color list, play cost/DP/digivolution-requirement field definitions) " +
    "restate comprehensive-0034..0045 (ch02-card-information.test.ts, already covering " +
    "Name/Traits/Digivolution Requirements/Color/DP).",
);

markNotTestable(
  "manual-0002",
  "OCR-DAMAGED: real card text from an unrelated printed card ('Start of Your Main " +
    "Phase On Play Yo may place the p card ... opponent has a Digimon, gain 1 m mory') " +
    "is interleaved mid-sentence with the Tamer/Option card-anatomy field list, and " +
    "'Tomoro Tenma & Kyo Sawes hir' is a garbled card name. The identifiable normative " +
    "content ('Tamer cards are treated as Tamers while on the field'; the Security " +
    "Effect / Inherited Effect field definition) restates comprehensive-0070 (ch04 " +
    "§4-3, already tested) and the Security Digimon rule already tested at " +
    "comprehensive-0071 (ch04 §4-4) / comprehensive-0221 (ch16a §16-1..16-4-3).",
);

markNotTestable(
  "manual-0003",
  "OCR-DAMAGED: a card's Main-effect and Security-effect text ('Use Req. «[BEATBKEAK] " +
    "trait» ... DOOr 02' — a page-footer OCR artifact) is interleaved with the color-" +
    "list boilerplate and the start of the 'Game Areas' section. The identifiable " +
    "normative content (7 printed colors + multicolor; Security Stack as the security-" +
    "check defensive wall; a shared Memory Gauge; the Battle Area) restates " +
    "comprehensive-0045 (ch02 §2-4/2-5, colors), comprehensive-0066 (ch03 §3-7, " +
    "Security Stack), comprehensive-0068 (ch04 §4-1, Memory), and comprehensive-0060 " +
    "(ch03 §3-4, Field/Battle Area) — all already tested.",
);

markNotTestable(
  "manual-0004",
  "Deck (exactly 50, ≤4 copies) / Digi-Egg Deck (0-5, ≤4 copies) construction restates " +
    "comprehensive-0027..0029, already tested with real decklists at ch01-game-overview.test.ts " +
    "§1-4-1-2-1 (deckValidation.ts's validateDecklist). The precedence clause ('if there are any " +
    "discrepancies between the rule manual and the card text, the card text should take " +
    "precedence') is an editorial/authoring instruction about how HUMANS resolve conflicting " +
    "RULE TEXT — it has no GameState/ServerEvent counterpart (the engine reads compiled card IR " +
    "at runtime, never the rule manual itself), so it carries no behavior to assert on, the same " +
    "way `not-testable.ts`'s own seeded entries carry no rule content.",
);

markNotTestable(
  "manual-0005",
  "Token Cards intro (non-game cards, prepared in advance, can't be included in a deck/Digi-Egg " +
    "deck, must show orientation) restates comprehensive-0090 (4-20-1) and comprehensive-0100/" +
    "0101, already tested at ch04-basic-terminology.test.ts §4-20 and ch05-game-preparation.test." +
    "ts §5-1/§5-2 (which specifically proves token cards can never appear in a legal decklist).",
);

describe("manual-0006 — Token sub-rules: can a token digivolve?", () => {
  it(
    "NOW MET: a Digimon card should not be able to digivolve onto a token permanent",
    async () => {
      cite(
        "manual-0006",
        "'Cards can't be stacked with tokens.' / 'Tokens can't get linked. (They can't digivolve " +
          "or have cards placed under them by an effect)' / 'A Token played as a Digimon will be " +
          "treated the same as a normal Digimon.'",
      );

      // DIVERGENCE (documented, not fixed — file ownership excludes engine code): neither
      // `matchingEvoCost`/`matchingEvoCostIgnoringColor` (src/engine/cards/cardData.ts) nor
      // `validateDigivolve` (src/engine/actions/digivolve.ts) ever reads `CardDefinition.isToken`
      // — grep confirms `isToken` is consulted only by playCard/token-play code and targeting
      // filters, nowhere in the digivolve path. A real token permanent (KoHagurumon Token: Lv.3
      // Black) therefore satisfies an ordinary EvoCost the same as a printed Lv.3 Black Digimon
      // would, and a legal-looking digivolve onto it succeeds — contradicting the manual's own
      // "Tokens can't digivolve" rule.
      const s = setup();
      s.state.memory = 20;

      const permanent = await (s.engine as unknown as {
        primitives: { playToken(seat: Seat, name: string, opts?: { payCost?: boolean }): Promise<Permanent | undefined> };
      }).primitives.playToken(0, "KoHagurumon Token", { payCost: false });
      expect(permanent).toBeDefined();
      const tokenDef = requireCardDefinition(permanent!.topCard!.cardId);
      expect(tokenDef.isToken).toBe(true);
      expect(tokenDef.level).toBe(3);

      // Golemon (BT10-062): plain EvoCost {color: Black, level: 3}, no name gate — a clean probe.
      const golemon = s.give(0, Zone.Hand, "BT10-062");
      s.state.memory = 1; // Golemon's evoCost memoryCost

      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: permanent!.permanentId,
        instanceId: golemon.instanceId,
      });

      // EXPECTED (per manual-0006, "Tokens can't digivolve"): rejected. ACTUAL (engine bug): the
      // digivolve is accepted and Golemon stacks onto the token permanent.
      expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    },
  );
});

// manual-0006 is CITED (not marked not-testable — the meta-test rejects an id that is both) by
// the it.fails DIVERGENCE test directly above. Its remaining content — the Token-preparation
// continuation ("Tokens must be separate cards from your deck...") and game-preparation steps
// (shuffle, security stack of 5, memory counter at 0) — restates comprehensive-0100/0101,
// already tested at ch05-game-preparation.test.ts §5-1/§5-2. The "can't get linked" half of the
// cited rule can't be independently driven through a player intent because none exists
// (ch06-game-procedures.test.ts's own it.fails at comprehensive-0109 already documents that
// Linking has no player-facing Intent at all — the same unimplemented seam this file would
// otherwise have to reach through); the digivolve half IS driven above.

markNotTestable(
  "manual-0007",
  "The 'Paying Costs' worked example (moving the memory counter 3 spaces right for a cost of 3; " +
    "a cost of 13 being unaffordable but becoming payable once a reduction effect brings it to " +
    "10) restates the MemoryGauge mechanics already tested at comprehensive-0068 (ch04 §4-1, " +
    "MemoryGauge.pay/gainMemory) and the cost-affordability gate already tested throughout " +
    "ch07-playing-a-card.test.ts (a card can't be played/declared without enough memory; a cost " +
    "reduction that brings it within reach makes it legal).",
);

markNotTestable(
  "manual-0008",
  "Card Orientation (unsuspended vs. suspended, 'suspending'/'unsuspending') restates " +
    "comprehensive-0082, already tested at ch04-basic-terminology.test.ts §4-12 " +
    "(GameStateAccess.suspend/unsuspend). The Unsuspend/Draw/Breeding/Main phase list restates " +
    "comprehensive-0103..0110, already tested at ch06-game-procedures.test.ts.",
);

describe("manual-0009 — Breeding Phase: moving isn't playing, and a moved Digimon can attack same-turn", () => {
  it(
    "moving a Digimon out of the breeding area does NOT fire its [On Play] effect, and it CAN " +
      "attack the turn it was moved (no summoning sickness) — a distinct behavioral angle from " +
      "the orientation-preservation fact ch04's comprehensive-0086 already proves",
    async () => {
      cite(
        "manual-0009",
        "'Moving Digimon from the breeding area to the battle area isn't considered playing the " +
          "Digimon, so On Play effects won't activate. In addition, this isn't considered playing " +
          "a Digimon, therefore a Digimon can attack on the same turn it was moved.'",
      );

      // AD1-001 has no [On Play] of its own; use a real card with one so a fired On Play is
      // observable. BT10-020 (Deckerdramon, used elsewhere in this suite) has "[On Play] Draw 1
      // ...".
      const state = new GameState();
      const p0 = new PlayerState();
      p0.seat = 0;
      state.players[0] = p0;
      state.turnSeat = 0;
      state.turnCount = 3; // "this turn" — must match for the summoning-sickness probe below
      state.phase = Phase.Breeding;

      const egg = instance("BT10-020", 0, false);
      p0.eggDeck.push(egg);
      let idSeq = 0;
      const hatchResult = applyHatchEgg(state, 0, { nextPermanentId: () => `hatch-${idSeq++}` });
      expect(hatchResult.ok).toBe(true);
      const hatched = p0.breeding!;
      hatched.baseDP = 5000;
      hatched.currentDP = 5000; // a moved Digimon must HAVE DP (§4-16-2) to be movable at all

      const moveEvents: unknown[] = [];
      const moveResult = applyMoveFromBreeding(
        state,
        0,
        { type: "moveFromBreeding", permanentId: hatched.permanentId },
        { emit: (e) => moveEvents.push(e) },
      );
      expect(moveResult.ok).toBe(true);

      // Not considered playing: the move emits `cardsMoved`, never `cardPlayed` — there is no
      // On Play trigger window to fire from this path at all (breeding.ts's applyMoveFromBreeding
      // never calls fireEnteredByEffect/emits cardPlayed, unlike playCard.ts).
      expect(moveEvents.some((e) => (e as { kind?: string }).kind === "cardPlayed")).toBe(false);
      expect(moveEvents.some((e) => (e as { kind?: string }).kind === "cardsMoved")).toBe(true);

      // Can attack the same turn: `enterFieldTurnCount` (the summoning-sickness gate read by
      // combat/legality.ts's canAttackerDeclare) is never set by applyMoveFromBreeding — only
      // playCard.ts's play path sets it. A moved-from-breeding permanent's enterFieldTurnCount
      // stays at its schema default (0), never equal to the CURRENT turnCount (3), so the
      // summoning-sickness branch (`enterFieldTurnCount === access.game.turnCount`) never fires
      // for it.
      expect(hatched.enterFieldTurnCount).not.toBe(state.turnCount);
    },
  );
});

markNotTestable(
  "manual-0010",
  "Main Phase action list (A-G) restates comprehensive-0108 (ch06 §6-5, already tested). The " +
    "digivolution-rules intro ('you can declare a digivolution if a card on the field meets the " +
    "digivolution requirements...') restates comprehensive-0124/0125 (ch08 §8-1/§8-1-2, already " +
    "tested with real cards).",
);

markNotTestable(
  "manual-0011",
  "The digivolve declare/pay/place procedure and its worked cost examples (Lv.2 blue -> Lv.3 " +
    "[ADVENTURE] cost 0; Lv.3 -> Lv.4 [ADVENTURE] cost 2) restate comprehensive-0124..0126, " +
    "already behaviorally proven with real cards at ch08-digivolution.test.ts §8-1/§8-1-2 " +
    "(exact-requirement matching, cost payment, placement, draw-1 on resolve).",
);

markNotTestable(
  "manual-0012",
  "'A digivolution card ... isn't considered to be a card on the field'; digivolution cards " +
    "carrying inherited effects; <De-Digivolve> carrying over display format — restates " +
    "comprehensive-0076/0077 (ch04 §4-6-8/§4-7, already tested: stacked cards are trashed " +
    "together, digivolution cards live in permanent.stack not battleArea). The Option-card use " +
    "procedure restates comprehensive-0137/0138, already tested at ch09-using-cards.test.ts.",
);

markNotTestable(
  "manual-0013",
  "Color Requirements (need a same-color Digimon/Tamer on the field; a multicolor Option needs " +
    "ALL its colors present) restates comprehensive-0091, already tested at " +
    "ch04-basic-terminology.test.ts §4-21 (GameEngine.printedColorRequirementMet now falls " +
    "back to an ordinary Option's own printed `colors` when it carries no " +
    "`optionColorRequirements`). The Linking intro restates comprehensive-0140, already tested " +
    "at ch10-link.test.ts §10-1.",
);

markNotTestable(
  "manual-0014",
  "'The link DP value shown on a linked Digimon's link card is added to that Digimon's total " +
    "DP' is the SAME divergence already documented at comprehensive-0069's it.fails (ch04 §4-2, " +
    "'a Digimon with a Link card should get the printed link DP bonus added to its DP' — " +
    "ModifierLedger.baseDpOf/recomputeDP never read `permanent.linked` or `linkDp`). The link " +
    "declare/pay/plug procedure restates comprehensive-0140/0141, already tested at " +
    "ch10-link.test.ts.",
);

markNotTestable(
  "manual-0015",
  "'When a Digimon is linked, it gains the link effects on the link card' and the link-limit " +
    "replace-oldest rule restate comprehensive-0141, already tested at ch10-link.test.ts " +
    "§10-1-2 (link rules, link cap). The interleaved Piercing card-text fragment ('checks " +
    "security before the attack ends') restates comprehensive-0225, already tested at " +
    "ch16a-security-blocker-draw.test.ts §16-7.",
);

markNotTestable(
  "manual-0016",
  "OCR-DAMAGED tail: 'Raid' card-text fragments repeat verbatim from manual-0014/0015 " +
    "(duplicate OCR extraction of the same figure caption). The one new normative sentence — " +
    "linked cards not meeting their link requirements are trashed at the rule-check timing — " +
    "restates the link-requirement-mismatch rule check already tested at ch17-rule-checks.test." +
    "ts (§17-1-3-2-6/§17-1-3-2-7, 'link requirement / link category mismatch'). The Attack " +
    "section heading/timing list (1-5) restates comprehensive-0143, already tested at " +
    "ch11-attacking.test.ts §11-1.",
);
