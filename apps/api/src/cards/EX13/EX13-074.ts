import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-074 Rie Kishibe (Tamer, Purple/Black, play cost 4, [CS] type).
//
// Printed main text:
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [All Turns] [Once Per Turn] When any of your [Knightmon] text Digimon are played or
//     deleted, by placing 1 such card from your hand or trash under this Tamer, ＜Draw 1＞
//   [Main] [Once Per Turn] If this Tamer has 3 or more [Knightmon] text cards under it, it
//     may digivolve into [LordKnightmon] in the hand or trash for a digivolution cost of 3,
//     ignoring digivolution requirements.
// Printed security text:
//   [Security] Play this card without paying the cost.
// No printed inherited text (Tamers carry none).
//
// KB: `node tools/kb/query.mjs card EX13-074` reports no entries — EX13 is pre-release, so no
// card-specific rulings exist yet. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §6-2-1 / §6-2-1-1: start-of-turn processing runs at the unsuspend phase, BEFORE the
//     unsuspend processing itself, and the rule's own worked example is this exact sentence
//     ("If you have 2 or less memory, set it to 3").
//   - §4-1-3: "if you have N or less memory" reads the controller's own side of the gauge.
//   - §5-3: a "By <cost>, <effect>" clause is skipped whole when the cost is not paid, which is
//     the `optional` + `abortOnDecline` shape every peer uses (EX10-064, BT20-092, BT21-088).
//   - §15-14: [Once Per Turn] limits the physical card, so "played OR deleted" is ONE use per
//     turn shared by both event forms, not one use each.
//   - §4-23-2: a Digimon does not gain its digivolution cards' printed text, only their
//     effects — hence `printedTextOnly` on the live-permanent text filter (EX13-024's shape).

// "your [Knightmon] text Digimon" as a LIVE board subject. `match: "text"` is the full printed
// information union (name, traits, effects, inherited effects, every requirement header), so a
// Digimon merely NAMED Knightmon qualifies too, and so does one whose [Digivolve] header prints
// "w/[Knightmon] in text".
//
// `printedTextOnly: true` states the §4-23-2 reading explicitly: a permanent does not gain its
// digivolution cards' TEXT, only their effects, so "a [Knightmon] text Digimon" is the top card's
// own printed information (EX13-024, LM-012 are the prior art). It is NOT behaviourally provable
// on this card and is kept for record completeness: both of this clause's events reach the filter
// through a path that reads the card definition, and a card being PLAYED has an empty stack
// anyway, so deleting the flag leaves every behavioural test green (mutation-checked).
const knightmonTextDigimonOnBoard: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
  printedTextOnly: true,
};

// "1 such card from your hand or trash" — "such card" refers back to "[Knightmon] text Digimon",
// so the placed card is a Digimon CARD with [Knightmon] in its text. A loose hand/trash card is
// matched against its definition, where `printedTextOnly` has nothing to narrow, so the flag is
// deliberately absent here rather than copied over.
const knightmonTextDigimonCard: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
};

// "by placing 1 such card from your hand or trash under this Tamer, ＜Draw 1＞".
// The placement is the COST of the draw (BT20-092's identical "by placing ... under this Tamer,
// ＜Draw 1＞" cost shape: `destination: "digivolutionStack"` at the bottom, with `host: "target"`
// resolving through `underFilter: { isSelfRef: true }` — this Tamer itself).
const placeThenDraw: Action = {
  kind: "Draw",
  controller: "mine",
  amount: 1,
  cost: {
    kind: "place",
    target: {
      filter: knightmonTextDigimonCard,
      count: 1,
      from: ["hand", "trash"],
    },
    raw: "by placing 1 such card from your hand or trash under this Tamer",
    destination: "digivolutionStack",
    position: "bottom",
    host: "target",
    underFilter: { isSelfRef: true },
  },
  optional: true,
  abortOnDecline: true,
};

// "[All Turns] [Once Per Turn] When any of your [Knightmon] text Digimon are played or deleted".
// Two event forms, ONE physical per-turn use: both watchers carry the same `oncePerTurnKey`, the
// EX10-058 shape. Without the shared key each watcher keeps its own budget and the clause fires
// twice in a turn, which §15-14 forbids.
const ONCE_PER_TURN_KEY = "EX13-074/all-turns";

const playedOrDeletedWatcher: CardEffect = {
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  actions: [
    {
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: knightmonTextDigimonOnBoard,
      oncePerTurnKey: ONCE_PER_TURN_KEY,
      actions: [placeThenDraw],
    },
    {
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: knightmonTextDigimonOnBoard,
      oncePerTurnKey: ONCE_PER_TURN_KEY,
      actions: [placeThenDraw],
    },
  ],
};

// "[Main] [Once Per Turn] If this Tamer has 3 or more [Knightmon] text cards under it, it may
// digivolve into [LordKnightmon] in the hand or trash for a digivolution cost of 3, ignoring
// digivolution requirements."
//
//  - "cards under it" (not "Digimon cards") is the whole stack under this Tamer, so the gate
//    filter carries only the text reference — `selfDigivolutionStackCountAtLeast` counts SOURCE
//    stack cards matching the filter (BT11-065's shape). Note the printed gate counts [Knightmon]
//    text CARDS while the placing clause above only ever places [Knightmon] text DIGIMON cards:
//    another effect may put a non-Digimon [Knightmon] text card under this Tamer, and it counts.
//  - `[LordKnightmon]` is a bracketed name, so `nameExact`: "LordKnightmon (X Antibody)"
//    (BT19-073) normalizes to a different exact name and is correctly refused (KB Q1231/Q1232).
//  - "for a digivolution cost of 3" is `payCost: true` + `costOverride: 3`, which the digivolve
//    verb pays instead of the printed EvoCost — including instead of EX13-064's own
//    "[Digivolve] ... [Rie Kishibe]: Cost 5" route, which would otherwise be the cheapest legal
//    route from this Tamer.
//  - "ignoring digivolution requirements" is `ignoreRequirements: true`; a Tamer is not a legal
//    digivolution base for any printed Lv.6 requirement, so without it the clause could never
//    resolve.
const digivolveIntoLordKnightmon: Action = {
  kind: "Digivolve",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  into: {
    controllerDefault: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["LordKnightmon"], match: "nameExact" }],
  },
  from: ["hand", "trash"],
  payCost: true,
  costOverride: 3,
  ignoreRequirements: true,
  optional: true,
};

export const compiled: CompiledCard = {
  cardId: "EX13-074",
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    playedOrDeletedWatcher,
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      condition: {
        kind: "selfDigivolutionStackCountAtLeast",
        count: 3,
        filter: { nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
      },
      actions: [digivolveIntoLordKnightmon],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-074", compiled);
