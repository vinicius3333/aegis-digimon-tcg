import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-064 LordKnightmon (Digimon, Purple/Black Lv.6 Mega, Virus, [Holy Warrior]/[Royal Knight]/
// [CS], 12000 DP, play cost 12, printed EvoCosts: Purple Lv.5 for 4 and Black Lv.5 for 4).
//
// Printed clauses:
//   [Digivolve] Lv.5 w/[Knightmon] in text: Cost 3
//   [Digivolve] While you have 3 or fewer security cards, [Rie Kishibe]: Cost 5
//   [When Digivolving] You may play or use 1 play or use cost 8 or lower [Knightmon] text card
//     from your hand or trash without paying the cost.
//   [Your Turn] All of your [Knightmon] text Digimon gain ＜Alliance＞ (...) and ＜Piercing＞
//   [Your Turn] [Once Per Turn] When any of your other Digimon or Tamers are played, 1 of your
//     [Knightmon] text Digimon may gain ＜Rush＞ and ＜Collision＞ for the turn and attack.
// No inherited effect and no security effect are printed.
//
// KB: `node tools/kb/query.mjs card EX13-064` reports no entries — EX13 is pre-release. General
// rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-23-1 cards "with XX in their texts": the token anywhere in the information printed on
//     that card, which the engine models as `match: "text"` (name ∪ traits ∪ every printed text
//     field). §4-23-3 adds that an INHERITED-effect mention counts even when the card is not
//     sitting in digivolution cards, so BT7-059 DeadlyAxemon — whose NAME carries no "Knightmon"
//     but whose printed and inherited lines name [Knightmon] — is in scope for every filter here.
//     `match: "name"` would wrongly drop it.
//   - §4-23-5 notes are NOT text: this card's own ＜Alliance＞ parenthetical mentions
//     ＜Security A. +1＞, and that does not make the card one "with ＜Security A.＞ in its text".
//     Nothing here filters on that token, so the rule only constrains what must NOT be claimed.
//   - §16-24 ＜Alliance＞: on attack, by suspending 1 of your OTHER Digimon, add that Digimon's DP
//     to the attacker and it gains ＜Security A. +1＞ for the attack. The printed parenthetical on
//     this card restates exactly that, so the grant is the bare keyword.
//   - §16-30 ＜Collision＞: while the Digimon is attacking, all of the opponent's Digimon gain
//     ＜Blocker＞ and the opponent MUST block whenever possible.
//   - §3-4-5-8: breeding-area cards cannot be referenced by effects, which keeps the keyword
//     grants scoped to the battle area without an explicit `zone`.
//
// This card's own printed information contains "Knightmon" (its NAME, LordKnightmon), so it is
// itself one of "your [Knightmon] text Digimon" and grants itself ＜Alliance＞/＜Piercing＞ and is
// an eligible attacker for the last clause. That is the printed reading, not an over-match: the
// EX13-021 `printedTextOnly` scoping exists for a card whose own INHERITED line prints the very
// token it gates on, which is not this card's shape (EX13-058 carries the identical note).
const knightmonText = [{ tokens: ["Knightmon"], match: "text" as const }];

const ownKnightmonTextDigimon = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: knightmonText,
} satisfies Filter;

// "1 play or use cost 8 or lower [Knightmon] text card from your hand or trash": the printed noun
// is "card", so the play branch covers the playable kinds (Digimon and Tamer) and the use branch
// covers Options. `playCostLte: 8` is the PRINTED cost ceiling on both branches —
// `effectiveUseCostLte` is reserved for the differently worded "use cost with reductions applied"
// clauses (LM-023 Q5516), which this card does not print. Note the explicit ceiling is load-bearing
// on the Option branch for a second reason: `UseOptionWithoutCost` defaults to a cap of 5
// (BT21-062), which would silently shave the printed 8 down.
//
// No `zone` on either filter: the two printed source zones are carried by `from`, the BT19-086 /
// BT21-062 shape for a hand-or-trash fetch (`pickLoose` reads `from` for the zone set).
const playableFromHandOrTrash = {
  filter: { controllerDefault: "mine", kind: ["Digimon", "Tamer"], playCostLte: 8, nameOrTrait: knightmonText },
  count: 1,
} satisfies Target;

const optionInHandOrTrash = {
  controllerDefault: "mine",
  kind: ["Option"],
  playCostLte: 8,
  nameOrTrait: knightmonText,
} satisfies Filter;

// "Play or use" is two verbs, so the body is a `Modal` with one branch each — `PlayWithoutCost`
// for the playable kinds and `UseOptionWithoutCost` for the Option side, the EX13-058 / EX13-043
// encoding. `runModal` skips a branch with no legal candidate and auto-selects when only one
// branch remains, so a hand holding only a Digimon never asks which verb to use. `payCost: false`
// on both branches is the printed "without paying the cost"; no reduction arithmetic is involved,
// so the `UseOptionWithoutCost` scaled-reduction seam (EX13-043) is not reachable from here.
// `allowMultiColor: true` states the printed scope: the sentence narrows by text and cost only, so
// a multicolour Option such as BT18-099 stays eligible and the engine's own colour-requirement
// check (§4-22-3) remains the only colour gate.
const playOrUseKnightmonCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Knightmon]-text card", "Use a [Knightmon]-text Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableFromHandOrTrash,
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
        raw: "You may play 1 play cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionInHandOrTrash,
        from: ["hand", "trash"],
        payCost: false,
        allowMultiColor: true,
        optional: true,
        raw: "You may use 1 use cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost",
      },
    ],
  ],
};

// "[Your Turn] All of your [Knightmon] text Digimon gain ＜Alliance＞ ... and ＜Piercing＞" —
// EX13-058 prints the identical sentence shape (for the opponent's turn) and is encoded the same
// way: the turn window is the timing gate, one `GainKeyword` action per printed icon over
// `count: "all"`, and `duration: "permanent"` so the grant lives exactly as long as the window
// that re-derives it rather than expiring mid-turn.
//
// No `includeLaterEntrants`: that flag is for a grant resolved ONCE out of a timed window
// (EX1-068, BT17-040). This is a resident `YourTurn` clause the continuous pass re-derives from
// the live board on every recompute, so a Digimon arriving mid-turn is covered anyway.
const grantDuringYourTurn = (keyword: "Alliance" | "Piercing"): Action => ({
  kind: "GainKeyword",
  target: { filter: ownKnightmonTextDigimon, count: "all" },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "permanent",
  raw: `All of your [Knightmon] text Digimon gain ＜${keyword}＞`,
});

// "[Your Turn] [Once Per Turn] When any of your other Digimon or Tamers are played, 1 of your
// [Knightmon] text Digimon may gain ＜Rush＞ and ＜Collision＞ for the turn and attack."
//
// A `SubTrigger` on `whenPlayed` whose `sourceFilter` is "your other Digimon or Tamers"
// (`kind: ["Digimon", "Tamer"]` + `excludeSelf: true`, the BT17-069 / EX3-054 shape).
// `[Your Turn]` is the window and the printed `[Once Per Turn]` is the `frequency` budget.
//
// The body is one printed "may" covering three steps on ONE chosen Digimon, so the choice is made
// once by a `SelectBind` (optional + `abortOnDecline`, so declining stops the whole sentence) and
// the two grants and the attack all read it back through `fromSelectionRef` — the BT16-077 shape
// for "1 of your Digimon may gain ＜Rush＞ for the turn and attack". The alternative, BT20-102's
// `sameTarget` chain, cannot carry TWO keyword grants plus the attack off a single choice.
//
// The attack is printed unqualified ("and attack"), not "attack a player", so no `attackPlayer`
// flag: `fromSelectionRef` with an empty filter leaves `forceAttack`'s own candidate list intact
// (player + every legal opposing Digimon). Stating `attackPlayer: false` — which an action-level
// `target.filter.kind: ["Digimon"]` would silently imply (`actions/combat.ts:36`) — would drop the
// player from the printed choice.
const RUSHER = "EX13-064/rush-collision-attacker";

const chooseKnightmonTextAttacker: Action = {
  kind: "SelectBind",
  target: { filter: ownKnightmonTextDigimon, count: 1, bindAs: RUSHER },
  optional: true,
  abortOnDecline: true,
  raw: "1 of your [Knightmon] text Digimon may",
};

const grantForTheTurn = (keyword: "Rush" | "Collision"): Action => ({
  kind: "GainKeyword",
  target: { fromSelectionRef: RUSHER, filter: {}, count: 1 },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "forTheTurn",
  raw: `gain ＜${keyword}＞ for the turn`,
});

const rushCollisionAttack: Action = {
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"], excludeSelf: true },
  actions: [
    chooseKnightmonTextAttacker,
    grantForTheTurn("Rush"),
    grantForTheTurn("Collision"),
    {
      kind: "Attack",
      target: { fromSelectionRef: RUSHER, filter: {}, count: 1 },
      raw: "and attack",
    },
  ],
  raw: "When any of your other Digimon or Tamers are played, 1 of your [Knightmon] text Digimon may gain ＜Rush＞ and ＜Collision＞ for the turn and attack",
};

const whenDigivolving: CardEffect = { trigger: "WhenDigivolving", actions: [playOrUseKnightmonCard] };

export const compiled: CompiledCard = {
  cardId: "EX13-064",
  effects: [
    whenDigivolving,
    { trigger: "YourTurn", actions: [grantDuringYourTurn("Alliance"), grantDuringYourTurn("Piercing")] },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [rushCollisionAttack] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    // "[Digivolve] Lv.5 w/[Knightmon] in text: Cost 3" — a level-pinned TEXT route with no colour
    // requirement (`texts`, not `names`: BT17-040 / EX13-058's encoding of the same header). It is
    // both cheaper than the printed Purple/Black-Lv.5-for-4 EvoCosts and wider (any colour), so
    // both halves are observable.
    { level: 5, texts: ["Knightmon"], cost: 3, isAlternate: true },
    // "[Digivolve] While you have 3 or fewer security cards, [Rie Kishibe]: Cost 5" — a bracketed
    // card name is an EXACT identity (`namesExact`), and the base is a TAMER, not a Digimon
    // (BT23-074 / KB Q6703). `whileCondition` is the field the digivolve validator actually reads
    // for the security gate; a `condition` key is ignored outright (LM-021's recorded fix).
    {
      namesExact: ["Rie Kishibe"],
      baseIsTamer: true,
      cost: 5,
      isAlternate: true,
      whileCondition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "security",
        op: "lte",
        value: 3,
        raw: "while you have 3 or fewer security cards",
      },
    },
  ],
};

registerIrCard("EX13-064", compiled);
