import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-060 Alphamon (Black/Yellow Lv.6 Mega, Data,
// [Holy Warrior]/[Royal Knight]/[X Antibody]/[Chronicle], play cost 13, DP 13000,
// printed EvoCosts Black Lv.5 for 5 and Yellow Lv.5 for 5).
//
// Printed clauses:
//   [Digivolve] [Grademon]/Lv.5 w/[Chronicle] trait: Cost 4
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Chronicle] trait
//   [When Digivolving] 1 of your opponent's Digimon gets -8000 DP until their turn ends. Then,
//     if they have 5 or more memory, gain 2 memory.
//   [Your Turn] [Once Per Turn] When any of your [Chronicle] trait Digimon or Tamers are played,
//     1 of your Digimon may attack. Then, you may activate 1 of this Digimon's [When Digivolving]
//     effects.
//   [End of Your Turn] [Once Per Turn] You may play 1 [Chronicle] trait card without [Alphamon]
//     in its name from your hand with the cost reduced by 6. It gains ＜Rush＞ for the turn.
// No inherited effect and no security effect are printed.
//
// KB: `node tools/kb/query.mjs card EX13-060` reports no card-specific KB entries in the current
// local index (EX13 is pre-release). General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-3 / §7-3-2 Assembly: materials come from the TRASH only, the exact printed slot count
//     must be placed, the reduction is the flat printed -5, and §7-3-2-6 stacks the leftmost
//     listed material (the Lv.5) closest to the played card.
//   - §16-14 ＜Rush＞: the granted Digimon may attack the turn it is played.
//   - §3-4-5-8: breeding-area cards can't be referenced, so board filters pin
//     `zone: "battleArea"`.
//
// The header "[Grademon]/Lv.5 w/[Chronicle] trait: Cost 4" is BT20-056's shape: TWO alternate
// requirements at cost 4 — the exact printed name, and the COLORLESS "Lv.5 w/[Chronicle] trait",
// which admits the red/black BT20-015 Hisyaryumon no catalog EvoCost reaches.
//
// "[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Chronicle] trait" is EX13-036's assembly line with a
// different trait and no color: three single-card slots in printed order, each level-pinned, all
// sharing the EXACT [Chronicle] trait. `traits` (exact equality over forms ∪ attributes ∪ types)
// is the "w/[X] trait" reading; `nameOrTrait ... match: "text"` — which EX13-024 correctly uses
// for its own differently worded "[X] in its text" line — would wrongly admit a card that merely
// mentions [Chronicle] in an effect.
const CHRONICLE_TRAIT: NonNullable<Filter["nameOrTrait"]>[number] = { tokens: ["Chronicle"], match: "trait" };

// "1 of your opponent's Digimon gets -8000 DP until their turn ends." — "their" is the opponent,
// so the duration is `untilOpponentTurnEnd` (the same ref BT20-056 uses for its own -8000).
// "Then, if they have 5 or more memory, gain 2 memory." — "they" is still the opponent, so the
// gate reads the OPPONENT's side of the gauge (`controller: "opponent"`), not the turn-relative
// default. It is a sequential "Then", not a rider on the debuff, so it is its own action whose
// `condition` is evaluated after the debuff resolved.
const whenDigivolving = (): Action[] => [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
    amount: -8000,
    duration: "untilOpponentTurnEnd",
    raw: "1 of your opponent's Digimon gets -8000 DP until their turn ends",
  },
  {
    kind: "GainMemory",
    amount: 2,
    condition: { kind: "memoryAtLeast", controller: "opponent", value: 5, raw: "they have 5 or more memory" },
    raw: "Then, if they have 5 or more memory, gain 2 memory",
  },
];

// "[Your Turn] [Once Per Turn] When any of your [Chronicle] trait Digimon or Tamers are played,
// 1 of your Digimon may attack. Then, you may activate 1 of this Digimon's [When Digivolving]
// effects."
//
// A `whenPlayed` SubTrigger, the EX13-009 / BT23-006 shape. `sourceFilter` is the printed subject
// — the controller's own ("mine") [Chronicle] Digimon OR Tamers, so `kind` carries both card
// types rather than two watchers. The `YourTurn` wrapper is carried onto the installed watcher as
// `turnScope: "yourTurn"`, so an opponent-turn play (a [Counter] Option, say) does not wake it,
// and `frequency: "OncePerTurn"` becomes the watcher's per-turn ledger key.
//
// "1 of your Digimon may attack" is EX13-077's `Attack` action with `optional: true`; unlike
// EX13-077 no "without suspending" is printed, so the attacker suspends normally.
//
// "you may activate 1 of this Digimon's [When Digivolving] effects" is `ReactivateEffect` with
// `fromTrigger: "WhenDigivolving"` — the EX13-036 encoding for the same printed sentence, except
// that EX13-036 re-runs its [Security] window. With no `target`, the interpreter re-runs THIS
// card's own compiled [When Digivolving] CardEffect with this permanent as the source, which is
// the printed "this Digimon's". `optional: true` is the printed "you may".
const chronicleEntryAttack = (): Action => ({
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: {
    controller: "mine",
    kind: ["Digimon", "Tamer"],
    nameOrTrait: [CHRONICLE_TRAIT],
  },
  actions: [
    {
      kind: "Attack",
      target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
      optional: true,
      raw: "1 of your Digimon may attack",
    },
    {
      kind: "ReactivateEffect",
      fromTrigger: "WhenDigivolving",
      count: 1,
      optional: true,
      raw: "Then, you may activate 1 of this Digimon's [When Digivolving] effects",
    },
  ],
  raw: "When any of your [Chronicle] trait Digimon or Tamers are played, 1 of your Digimon may attack. Then, you may activate 1 of this Digimon's [When Digivolving] effects",
});

// "[End of Your Turn] [Once Per Turn] You may play 1 [Chronicle] trait card without [Alphamon] in
// its name from your hand with the cost reduced by 6. It gains ＜Rush＞ for the turn."
//
// `PlayWithoutCost` with `payCost: true` + `reduceCostBy: 6` is the "with the cost reduced by N"
// encoding (the reduction is folded into the play verb and floored at 0). The printed subject is
// "1 ... card", not "1 Digimon card", so no `kind` narrows the pool: a [Chronicle] Tamer
// (EX13-072) is an equally legal pick alongside a [Chronicle] Digimon.
//
// An OPTION is NOT in that pool, and that is the rules reading rather than an engine gap.
// Comprehensive rules §6-5 separate the Main-phase actions "play a Digimon card or a Tamer card
// from the hand" from "USE an Option card from the hand", so a printed "play 1 card" never
// reaches an Option; the printed rider "It gains ＜Rush＞ for the turn" points the same way,
// because only a Digimon can hold the keyword. `playableCandidates` in
// `apps/api/src/engine/effects/interpreter/actions/play.ts` drops Option-only cards from a
// kind-less play pool for exactly that reason, and the test asserts the exclusion positively.
//
// "without [Alphamon] in its name" is `excludeNames`, which is SUBSTRING-based — exactly the
// printed "in its name" reading, so it also refuses BT20-060 "Alphamon: Ouryuken" and this card's
// own copies in hand.
//
// "It" is the card just played, which is `bindResultAs` + a `boundRef` filter (ST14-09's
// encoding), NOT `sameTarget`: the play action's chosen target is a HAND card, while the Rush
// grant needs the resulting battle-area permanent. `kind: ["Digimon"]` on the grant is the rules
// floor rather than a narrowing — ＜Rush＞ is a Digimon-only keyword, so a played Tamer or Option
// simply has nothing to receive.
const PLAYED_CARD_BINDING = "ex13-060-playedChronicleCard";

const endOfTurnDiscount = (): Action[] => [
  {
    kind: "PlayWithoutCost",
    target: {
      filter: {
        controller: "mine",
        nameOrTrait: [CHRONICLE_TRAIT],
        excludeNames: ["Alphamon"],
      },
      count: 1,
    },
    from: ["hand"],
    payCost: true,
    reduceCostBy: 6,
    optional: true,
    abortOnDecline: true,
    bindResultAs: PLAYED_CARD_BINDING,
    raw: "You may play 1 [Chronicle] trait card without [Alphamon] in its name from your hand with the cost reduced by 6",
  },
  {
    kind: "GainKeyword",
    target: { filter: { boundRef: PLAYED_CARD_BINDING, kind: ["Digimon"] }, count: 1 },
    keyword: { keyword: "Rush", raw: "＜Rush＞" },
    duration: "forTheTurn",
    raw: "It gains ＜Rush＞ for the turn",
  },
];

export const compiled: CompiledCard = {
  cardId: "EX13-060",
  effects: [
    { trigger: "WhenDigivolving", actions: whenDigivolving() },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [chronicleEntryAttack()] },
    { trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: endOfTurnDiscount() },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Grademon"], cost: 4, isAlternate: true },
    { level: 5, traits: ["Chronicle"], cost: 4, isAlternate: true },
  ],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, traits: ["Chronicle"], count: 1 },
        { level: 4, traits: ["Chronicle"], count: 1 },
        { level: 3, traits: ["Chronicle"], count: 1 },
      ],
    },
  ],
};

registerIrCard("EX13-060", compiled);
