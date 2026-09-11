import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-024 Slayerdramon (Digimon, Blue/Red, Lv.6 Mega [Dragonkin], Vaccine, 12000 DP,
// play cost 12, printed EvoCosts Blue Lv.5 for 4 and Red Lv.5 for 4).
//
// Printed main text:
//   [Digivolve] [Wingdramon]/[Groundramon]: Cost 3
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Dracomon]/[Examon] in text
//   ＜Raid＞
//   ＜Blocker＞
//   [On Play] [When Digivolving] For each of this Digimon's digivolution cards, trash any 1
//     digivolution card from your opponent's Digimon. Then, you may return all of their Digimon
//     with the fewest digivolution cards to the bottom of the deck.
//   [All Turns] [Once Per Turn] When any of your [Dracomon] or [Examon] text Digimon would leave
//     the battle area, by suspending 1 of your such Digimon, they don't leave.
// Printed inherited text: the same [All Turns] [Once Per Turn] leave-prevention clause.
// No printed security text.
//
// KB: `node tools/kb/query.mjs card EX13-024` reports no entries — EX13 is pre-release. The
// card is a direct reprint-family sibling of BT20-027 Slayerdramon, whose rulings cover the
// shared vocabulary and are the general rules this implementation leans on:
//   - Q4317: "X in its text" is the token anywhere in the printed information (name, traits,
//     effects, inherited effects, (Rule), and every requirement header), which the engine models
//     as `match: "text"`.
//   - Q4318: the leave-prevention watcher fires for any card with [Dracomon] or [Examon] in its
//     text, not only Digimon named Dracomon/Examon.
//   - Q4319: "they don't leave" protects EVERY simultaneously-leaving matching Digimon without
//     choosing them — `affectsAll: true` plus `count: "all"`.
// Comprehensive rules consulted: §7-3 / §7-3-2 (Assembly materials come from the TRASH, are
// placed under the played card in header order, and reduce the play cost by the flat printed
// amount), §16-4 (＜Blocker＞) and §16-22 (＜Raid＞), both engine-resident so the IR only declares
// them.
//
// "[Digivolve] [Wingdramon]/[Groundramon]: Cost 3" is a bracket-only named source, so
// `namesExact` — a substring `names` match would also accept relatives such as Wingdramon's
// own [Dramon]-named neighbours. It carries no level or color, which makes it strictly wider
// than the two catalog EvoCosts (Blue Lv.5 / Red Lv.5 for 4): the GREEN Groundramon (EX3-041,
// BT20-042) and the mono-blue Wingdramon (EX3-020) all reach this card for 3. Identical header
// to BT20-027, so the IR is identical too.

// "your [Dracomon] or [Examon] text Digimon". `match: "text"` is Q4317's union — the token
// anywhere in the card's own printed information (name, traits, effects, inherited effects,
// (Rule), and every requirement header).
//
// `printedTextOnly: true` is the deliberate narrowing: by default a live `match: "text"` ref also
// reads a permanent's digivolution-card INHERITED text (`permanentMatchesFilter`'s live-text
// branch, EX1-021 Q3208), which would make any Digimon merely carrying this card — or any other
// [Dracomon]/[Examon] card — in its stack a "[Dracomon] or [Examon] text Digimon". Comprehensive
// rules §4-23-2 says the opposite in as many words: a Digimon does not GAIN a digivolution card's
// text, only its effects. So the printed reading is the top card's own information, which is
// exactly what this flag expresses (LM-012's [Angoramon]-text watcher is the prior art).
//
// PEER DIVERGENCE worth the coordinator's attention: BT20-027 Slayerdramon — the same card name,
// with the same "[Dracomon]/[Examon] in its text" filters — omits the flag and therefore counts
// an inheriting host as matching. One of the two is wrong; §4-23-2 says it is BT20-027.
const dracomonOrExamonText: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
  printedTextOnly: true,
};

// "For each of this Digimon's digivolution cards, trash any 1 digivolution card from your
// opponent's Digimon." The repetition is a per-card multiplier on ONE pooled trash, not N
// separate single-host trashes: each iteration picks "any 1 ... from your opponent's Digimon"
// across the whole board, which is EX12-035's `scope: "acrossDigimon"` pool with the amount
// scaled instead of the printed flat 4. `unit: "digivolutionCards"` is the SOURCE permanent's
// own stack size (`scaleFactor`'s self-stack branch), and `runDigivolutionAction` folds the
// factor into `amount` once, so `runTrashDigivolution` sees the finished count.
// `digivolutionCards: "hasAny"` keeps source-free opponent Digimon out of the candidate pool
// (EX12-035, BT20-027).
const trashStackCards: Action = {
  kind: "TrashDigivolution",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
    count: "all",
  },
  amount: 1,
  scope: "acrossDigimon",
  scaling: { per: 1, filter: { controllerDefault: "mine" }, unit: "digivolutionCards" },
  raw: "For each of this Digimon's digivolution cards, trash any 1 digivolution card from your opponent's Digimon",
};

// "Then, you may return ALL of their Digimon with the fewest digivolution cards to the bottom of
// the deck." `superlative: "lowestDigivolutionCards"` is the server-side narrowing applied after
// base eligibility, keeping every tied extremum (BT24-030, AD1-013); `count: "all"` takes the
// whole narrowed set rather than one member. It deliberately does NOT carry
// `digivolutionCards: "hasAny"` — a stackless Digimon has the fewest digivolution cards, so the
// preceding trash can itself create the set this clause returns. "you may" is the clause's only
// optionality, so `optional: true` with no cost.
const returnFewestStackDigimon: Action = {
  kind: "Return",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDigivolutionCards" },
    count: "all",
  },
  to: "deckBottom",
  optional: true,
  raw: "you may return all of their Digimon with the fewest digivolution cards to the bottom of the deck",
};

// "When any of your [Dracomon] or [Examon] text Digimon would leave the battle area, by
// suspending 1 of your such Digimon, they don't leave." Same shape as BT20-027's inherited
// clause with two printed differences:
//   - no "other than in battle", so NO `leaveCause` — an absent cause covers every matching
//     leave for the event, battle deletion included (BT20-027 narrows to "otherThanBattle").
//   - the cost is "1 of your SUCH Digimon", a board filter, not "this Digimon": the suspend cost
//     carries the same [Dracomon]/[Examon]-text predicate rather than `isSelfRef`, so any
//     unsuspended matching ally can pay (`costs.ts` "suspend" requires `isSuspended === false`).
// `affectsAll: true` + `target.count: "all"` is Q4319's "all of those Digimon ... without having
// to choose them".
const preventLeave: Action = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  optional: true,
  affectsAll: true,
  target: { filter: dracomonOrExamonText, count: "all" },
  cost: {
    kind: "suspend",
    target: { filter: dracomonOrExamonText, count: 1 },
    raw: "by suspending 1 of your [Dracomon]/[Examon]-text Digimon",
  },
  raw: "When any of your [Dracomon] or [Examon] text Digimon would leave the battle area, by suspending 1 of your such Digimon, they don't leave.",
};

// The clause is printed TWICE — once as main text and once as inherited text — each with its own
// [Once Per Turn]. They are separate printed instances, so each effect carries its own
// `frequency` and no `sharedUseKey`: pooling them would let the main copy starve the inherited
// one on the same turn (contrast the ONE [Once Per Turn] shared across EX13-020's three timings).
const leavePrevention = (isInherited: boolean): CardEffect => ({
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  ...(isInherited ? { isInherited: true } : {}),
  actions: [preventLeave],
});

// The two printed timings each print their own activation; there is no [Once Per Turn] on the
// line, so neither window carries a frequency or a shared key.
const removalEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [trashStackCards, returnFewestStackDigimon],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Raid", raw: "＜Raid＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    removalEffect("OnPlay"),
    removalEffect("WhenDigivolving"),
    leavePrevention(false),
    leavePrevention(true),
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Wingdramon", "Groundramon"], cost: 3, isAlternate: true }],
  // "[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Dracomon]/[Examon] in text" lists three ordered
  // single-card slots, each of which must satisfy the text gate on its own (EX12-035 / EX13-014
  // shape). The level is the only thing that differs between slots, so this is three `count: 1`
  // entries at levels 5, 4 and 3 rather than one `differentLevels` slot of count 3 — the printed
  // header fixes WHICH level goes in WHICH slot, and §7-3-2-6 derives the resulting stack order
  // from that same left-to-right reading.
  assemblyRequirement: [
    {
      materials: [5, 4, 3].map((level) => ({
        count: 1,
        level,
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" as const }],
      })),
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-024", compiled);
