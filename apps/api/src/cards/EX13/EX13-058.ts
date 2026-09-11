import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-058 Knightmon (Digimon, Black Lv.5 Ultimate, Data, [Warrior], 7000 DP, play cost 7,
// printed EvoCost: Black Lv.4 for 3).
//
// Printed clauses:
//   [Digivolve] Lv.4 w/[Knightmon] in text: Cost 3
//   [When Attacking] [On Deletion] You may play or use 1 card with [Knightmon] in its text and a
//     play or use cost of 4 or less from your hand without paying the cost.
//   [Opponent's Turn] All of your Digimon with [Knightmon] in their texts gain ＜Reboot＞ and
//     ＜Blocker＞
//   [Inherited] [All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] in their
//     texts are played, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
// No security effect is printed.
//
// KB: `node tools/kb/query.mjs card EX13-058` reports no entries — EX13 is pre-release. General
// rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-23-1 cards "with XX in their texts": the token anywhere in the information printed on
//     that card, which the engine models as `match: "text"` (name ∪ traits ∪ every printed text
//     field). §4-23-3 adds that an INHERITED-effect mention still counts even when the card is
//     not sitting in digivolution cards, which is what makes BT7-059 DeadlyAxemon — whose name
//     carries no "Knightmon" but whose inherited line names [Knightmon] — a legal source and a
//     legal grant recipient. `match: "name"` would wrongly drop it.
//   - §4-22-2/§4-22-3 colour requirements: a multicolour Option needs every one of its colours
//     represented, which is why the Option branch carries `allowMultiColor` (the printed sentence
//     restricts the card by TEXT and COST only, never by colour) and leaves the colour check
//     itself to the engine.
//   - §16-12-1 ＜De-Digivolve N＞: trash cards from the chosen Digimon's stack starting with the
//     top card; the engine's `DeDigivolve` action is that keyword.
//   - §3-4-5-8: breeding-area cards cannot be referenced by effects, which keeps the keyword
//     grant scoped to the battle area without an explicit `zone`.
//
// This card's own printed information contains "Knightmon" (its name), so it is itself one of
// "your Digimon with [Knightmon] in their texts" and grants itself ＜Reboot＞/＜Blocker＞. That is
// the printed reading, not an over-match, so no `printedTextOnly` scoping is wanted here: unlike
// EX13-021's case the token is the host's own NAME, which every reading of §4-23-1 includes.
const knightmonText = [{ tokens: ["Knightmon"], match: "text" as const }];

// "1 card ... and a play or use cost of 4 or less from your hand": the printed noun is "card",
// so the play branch covers the playable kinds (Digimon and Tamer) and the use branch covers
// Options. `playCostLte: 4` is the PRINTED cost ceiling on both branches — `effectiveUseCostLte`
// is reserved for the differently worded "use cost with reductions applied" clauses (LM-023
// Q5516), which this card does not print.
const playableFromHand = {
  filter: {
    controllerDefault: "mine",
    zone: "hand",
    kind: ["Digimon", "Tamer"],
    playCostLte: 4,
    nameOrTrait: knightmonText,
  },
  count: 1,
} satisfies Target;

const optionInHand = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Option"],
  playCostLte: 4,
  nameOrTrait: knightmonText,
} satisfies Filter;

// "Play or use" is two verbs, so the body is a `Modal` with one branch each — `PlayWithoutCost`
// for the playable kinds and `UseOptionWithoutCost` for the Option side, the EX13-043 / EX13-012
// encoding. `runModal` skips a branch with no legal candidate and auto-selects when only one
// branch remains, so a hand holding only a Digimon never asks which verb to use. `payCost: false`
// on both branches is the printed "without paying the cost"; no reduction arithmetic is involved,
// so the `UseOptionWithoutCost` scaled-reduction seam (EX13-043) is not reachable from here.
// `allowMultiColor: true` states the printed scope: the sentence narrows by text and cost only,
// so a multicolour Option such as BT18-099 stays eligible and the engine's own colour-requirement
// check (§4-22-3) remains the only colour gate.
const playOrUseKnightmonCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Knightmon]-text card", "Use a [Knightmon]-text Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableFromHand,
        from: ["hand"],
        payCost: false,
        optional: true,
        raw: "You may play 1 card with [Knightmon] in its text and a play cost of 4 or less from your hand without paying the cost",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionInHand,
        from: ["hand"],
        payCost: false,
        allowMultiColor: true,
        optional: true,
        raw: "You may use 1 card with [Knightmon] in its text and a use cost of 4 or less from your hand without paying the cost",
      },
    ],
  ],
};

// No [Once Per Turn] is printed on the play-or-use line, so the two timings each get their own
// window and neither carries a `frequency` or a `sharedUseKey`.
const playOrUse = (trigger: "WhenAttacking" | "OnDeletion"): CardEffect => ({
  trigger,
  actions: [playOrUseKnightmonCard],
});

// "[Opponent's Turn] All of your Digimon with [Knightmon] in their texts gain ＜Reboot＞ and
// ＜Blocker＞" — BT24-041 prints the identical sentence shape and is encoded the same way: the
// `OpponentsTurn` window is the timing gate, two `GainKeyword` actions (one per printed icon)
// over `count: "all"`, and `duration: "permanent"` so the grant lives exactly as long as the
// window that re-derives it rather than expiring mid-turn.
//
// No `includeLaterEntrants`: that flag exists for a grant resolved ONCE out of a timed window
// (EX1-068, BT17-040), and this is a resident `OpponentsTurn` clause the continuous pass
// re-derives from the live board on every recompute — a Digimon arriving mid-turn is covered by
// the next pass, mutation-confirmed, so the flag would be inert decoration here.
const grantDuringOpponentTurn = (keyword: "Reboot" | "Blocker"): Action => ({
  kind: "GainKeyword",
  target: {
    filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: knightmonText },
    count: "all",
  },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "permanent",
  raw: `All of your Digimon with [Knightmon] in their texts gain ＜${keyword}＞`,
});

// "[All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] in their texts are
// played, ＜De-Digivolve 1＞ 1 of your opponent's Digimon." A `SubTrigger` on `whenPlayed` with a
// `controller: "mine"` `sourceFilter`, the EX13-009 / BT23-006 / BT25-074 shape for "when any of
// your <filter> are played". `[All Turns]` is the window and the printed `[Once Per Turn]` is the
// `frequency` budget; no "may" is printed, so the De-Digivolve is mandatory.
const deDigivolveOnKnightmonPlay: Action = {
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: knightmonText },
  actions: [
    {
      kind: "DeDigivolve",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: 1,
      raw: "＜De-Digivolve 1＞ 1 of your opponent's Digimon",
    },
  ],
  raw: "When any of your Digimon with [Knightmon] in their texts are played, ＜De-Digivolve 1＞ 1 of your opponent's Digimon",
};

export const compiled: CompiledCard = {
  cardId: "EX13-058",
  effects: [
    playOrUse("WhenAttacking"),
    playOrUse("OnDeletion"),
    {
      trigger: "OpponentsTurn",
      actions: [grantDuringOpponentTurn("Reboot"), grantDuringOpponentTurn("Blocker")],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [deDigivolveOnKnightmonPlay],
    },
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] Lv.4 w/[Knightmon] in text: Cost 3" — a level-pinned TEXT route with no colour
  // requirement, so it is the catalog Black-Lv.4-for-3 EvoCost widened across colours rather than
  // a cheaper version of it (`texts`, not `names`: BT17-040's encoding of the same header).
  //
  // NOT behaviourally provable today, and deliberately recorded as such: the route costs the same
  // 3 as the printed EvoCost, so its only observable widening is a NON-Black Lv.4 carrying
  // [Knightmon] in its text — and no such printing exists in the catalog (every Lv.4 with the
  // token includes Black). Deleting this entry leaves every behavioural test green; see the audit
  // note for EX13-058.
  digivolutionRequirement: [{ level: 4, texts: ["Knightmon"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-058", compiled);
