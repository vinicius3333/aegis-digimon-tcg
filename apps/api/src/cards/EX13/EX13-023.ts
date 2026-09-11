import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-023 UlforceVeedramon (Blue Lv.6 Mega, Vaccine, [Holy Warrior]/[Royal Knight]/[CS],
// 12000 DP, play cost 12, EvoCost Blue Lv.5 for 3).
//
// Printed main text:
//   [Digivolve] Lv.5 w/[CS] trait: Cost 3
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Veemon]/[Veedramon] in name
//   ＜Blocker＞
//   ＜Evade＞
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your Digimon may change
//     orientation.
//   [On Play] [When Digivolving] You may return all of your opponent's Digimon with the fewest
//     digivolution cards to the bottom of the deck.
//   [All Turns] Your opponent's effects can't reduce this unsuspended Digimon's DP, return its
//     stacked cards to the hand or deck, or trash them.
// No printed inherited text.
//
// KB: `node tools/kb/query.mjs card EX13-023` reports no entries — EX13 is pre-release. General
// rules consulted in `data/kb/rules/comprehensive.md`: §7-3 / §7-3-2 (Assembly materials come
// from the TRASH only, the exact printed count must be placed, the reduction is the flat printed
// -N, and §7-3-2-6 stacks the leftmost listed material on top) and §3-4-5-8 (breeding-area cards
// can't be referenced, which is why every own-board filter here pins `zone: "battleArea"`).
// ＜Blocker＞ and ＜Evade＞ are engine-resident keywords, so the IR only declares them.

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };

// "1 of your Digimon" is a board filter over the battle area, never the breeding area.
const ownDigimon: Filter = { controller: "mine", kind: ["Digimon"], zone: "battleArea" };

// "1 of your Digimon may change orientation."
//
// ENGINE NOTE (not a gap): there is no `ChangeOrientation` action, and EX13-023 is the only card
// in the catalog printing that sentence. Choosing the Digimon already determines the direction —
// an unsuspended one can only become suspended and a suspended one can only become unsuspended —
// so the clause is exactly a two-bullet Modal: suspend an unsuspended Digimon, or unsuspend a
// suspended one. `optionConditions` gate each bullet on a matching Digimon actually existing, so
// `runModal` (apps/api/src/engine/effects/interpreter/actions/modal.ts) skips the impossible
// direction and auto-selects when only one remains — without them both bullets are always
// "attemptable" (`canAttemptModalAction` returns true for Suspend/Unsuspend regardless of the
// target pool) and the player would be offered a guaranteed no-op branch.
const changeOrientation: Action = {
  kind: "Modal",
  choose: 1,
  optional: true,
  labels: ["Suspend 1 of your unsuspended Digimon", "Unsuspend 1 of your suspended Digimon"],
  optionConditions: [
    {
      kind: "youHave",
      filter: { controllerDefault: "mine", kind: ["Digimon"], zone: "battleArea", unsuspended: true },
      raw: "you have an unsuspended Digimon",
    },
    {
      kind: "youHave",
      filter: { controllerDefault: "mine", kind: ["Digimon"], zone: "battleArea", suspended: true },
      raw: "you have a suspended Digimon",
    },
  ],
  options: [
    [{ kind: "Suspend", target: { filter: { ...ownDigimon, unsuspended: true }, count: 1 } }],
    [{ kind: "Unsuspend", target: { filter: { ...ownDigimon, suspended: true }, count: 1 } }],
  ],
  raw: "1 of your Digimon may change orientation",
};

// "all of your opponent's Digimon with the fewest digivolution cards" — `count: "all"` over the
// `lowestDigivolutionCards` superlative, which narrows to the extremum of the eligible pool AFTER
// base eligibility and keeps every tied Digimon (boardPredicates.ts). A freshly played Digimon
// with no stack is the floor, so the clause routinely hits several permanents at once.
// `returnDigivolutionCardsFirst` is deliberately absent: the printed sentence returns the
// DIGIMON, and the engine's ordinary leave handling trashes the stack beneath it.
const returnFewestStacked: Action = {
  kind: "Return",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDigivolutionCards" },
    count: "all",
  },
  to: "deckBottom",
  optional: true,
  raw: "return all of your opponent's Digimon with the fewest digivolution cards to the bottom of the deck",
};

// The three printed timings of the orientation clause share ONE [Once Per Turn], so all three
// windows carry the same `sharedUseKey`: an on-play activation spends the when-digivolving and
// when-attacking activations too (EX13-020, EX13-012, EX12-024).
const orientationEffect = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-orientation",
  actions: [changeOrientation],
});

const returnEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [returnFewestStacked],
});

// "[All Turns] Your opponent's effects can't reduce this unsuspended Digimon's DP, return its
// stacked cards to the hand or deck, or trash them."
//
// Three protections on the host, all scoped to the opponent's effects, modelled exactly like
// BT26-029's identical sentence ("their effects can't reduce the DP of 1 of your Digimon, trash
// any of its stacked cards, or return them to hands or decks"):
//   - `dpImmune` + `byOpponentEffectsOnly` for the DP half,
//   - `StackTrashLock` for "or trash them" (the seat-aware stack-card lock, KB Q5943),
//   - `returnToHandOrDeck`, which `maps.ts` normalizes to `beReturned` + `byOpponentEffectsOnly`,
//     for "return its stacked cards to the hand or deck".
//
// "this UNSUSPENDED Digimon" is a live state gate, not a one-shot condition: the protection has
// to lift the moment the Digimon suspends (attacking, blocking, paying a suspend cost) and come
// back when it unsuspends. `Restrict` owns `while` for exactly that, and `StackTrashLock` — which
// has no `while` — rides the continuous pass instead: an `AllTurns` record is cleared and
// re-derived from a clean tier on every `recomputeContinuousEffects` pass, so its `condition` is
// re-read each time (EX11-070's [All Turns] StackTrashLock uses the same shape).
const unsuspendedGate = { kind: "selfUnsuspended" as const, raw: "this Digimon is unsuspended" };

const protection: Action[] = [
  {
    kind: "Restrict",
    target: self,
    restriction: "dpImmune",
    byOpponentEffectsOnly: true,
    while: unsuspendedGate,
    duration: "permanent",
    raw: "your opponent's effects can't reduce this unsuspended Digimon's DP",
  },
  {
    kind: "StackTrashLock",
    target: self,
    condition: unsuspendedGate,
    duration: "permanent",
    raw: "your opponent's effects can't trash this unsuspended Digimon's stacked cards",
  },
  {
    kind: "Restrict",
    target: self,
    restriction: "returnToHandOrDeck",
    byOpponentEffectsOnly: true,
    while: unsuspendedGate,
    duration: "permanent",
    raw: "your opponent's effects can't return this unsuspended Digimon's stacked cards to the hand or deck",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Evade", raw: "＜Evade＞" },
      ],
    },
    orientationEffect("OnPlay"),
    orientationEffect("WhenDigivolving"),
    orientationEffect("WhenAttacking"),
    returnEffect("OnPlay"),
    returnEffect("WhenDigivolving"),
    { trigger: "AllTurns", actions: protection },
  ],
  coverage: "full",
  residual: [],
  // "Lv.5 w/[CS] trait: Cost 3" carries no color, so it is strictly wider than the printed Blue
  // Lv.5 EvoCost: a YELLOW Lv.5 [CS] Digimon reaches this card for 3. `traits` is EXACT trait
  // equality over forms ∪ attributes ∪ types — the "w/[X] trait" wording — not a substring.
  digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }],
  // "Lv.5 × Lv.4 × Lv.3, all w/[Veemon]/[Veedramon] in name": three single-card slots in printed
  // order, each one level-pinned, sharing the same SUBSTRING name predicate ("in name", so
  // `names` rather than `namesExact` — AeroVeedramon and ExVeemon both qualify).
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, names: ["Veemon", "Veedramon"], count: 1 },
        { level: 4, names: ["Veemon", "Veedramon"], count: 1 },
        { level: 3, names: ["Veemon", "Veedramon"], count: 1 },
      ],
    },
  ],
};

registerIrCard("EX13-023", compiled);
