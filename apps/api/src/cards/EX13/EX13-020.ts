import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-020 Magnamon (Blue/Yellow Lv.4 Armor Form, Free, [Holy Warrior]/[Royal Knight],
// 7000 DP, play cost 7, EvoCost Blue Lv.3 / Yellow Lv.3 for 4).
//
// Printed main text:
//   [Digivolve] [Veemon]: Cost 3
//   [Assembly -2] [Veemon]
//   ＜Blocker＞
//   ＜Armor Purge＞
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] This Digimon gets +1000 DP
//     until your opponent's turn ends for each color in trashes. Then, to 1 of your opponent's
//     Digimon, give -4000 DP until their turn ends for every 5000 DP this Digimon has.
//   [End of Your Turn] [Once Per Turn] 1 of your [Free] or [Royal Knight] trait Digimon may
//     unsuspend.
// Printed inherited text:
//   [End of Your Turn] [Once Per Turn] 1 of your Digimon with the [Free] or [Royal Knight]
//     trait may unsuspend.
//
// KB: `node tools/kb/query.mjs card EX13-020` reports no entries — EX13 is pre-release. General
// rules consulted: comprehensive §7-3 / §7-3-2 (Assembly: materials come from the TRASH only, the
// exact count must be placed, and the reduction is the flat printed -N) and §16-19 (＜Armor Purge＞:
// an immediate-type deletion replacement paid by trashing this Digimon's own top card). Both are
// engine-resident, so the IR only declares them.
//
// "[Digivolve] [Veemon]: Cost 3" is a bracket-only named source, so `namesExact` — a substring
// `names` match would wrongly accept ExVeemon/Veedramon relatives (BT26-029's [Aegiomon] shape).
// It carries no level or color, which makes it strictly wider than the catalog EvoCost: a RED
// Veemon (BT20-009, EX3-004) reaches this card for 3 even though no red EvoCost is printed.
//
// "[Assembly -2] [Veemon]" is the same bracket-only name as one trash material slot
// (`namesExact`, `count: 1`), modelled exactly like BT26-037's Assembly -2 single-slot recipe.
//
// "for each color in trashes" is PLURAL — both players' trashes — so the scaling filter pairs
// `zone: "trash"` with `controller: "any"`, which `seatsForController` expands to both seats.
// `unit: "colors"` routes through `countColors`'s loose-card trash branch, which unions the
// printed colors of every trash card, so one Blue/Yellow dual-color card contributes 2.
const selfDpBuff: Action = {
  kind: "ModifyDP",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  amount: 1000,
  duration: "untilOpponentTurnEnd",
  scaling: { per: 1, unit: "colors", filter: { zone: "trash", controller: "any" } },
  raw: "This Digimon gets +1000 DP until your opponent's turn ends for each color in trashes",
};

const opponentDigimon: Target = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };

// ENGINE GAP (retained red). "for every 5000 DP this Digimon has" is a multiplier driven by the
// SOURCE permanent's live DP, and `Scaling.unit`
// (packages/shared/src/effects/ir/predicates/scaling.ts) has no DP-valued unit: `scaleFactor`
// (apps/api/src/engine/effects/interpreter/scaling.ts) can count cards, colors, security, trash,
// stack cards, memory and named counters, but never a permanent's DP. EX13-020 is the only card in
// the whole catalog printing this sentence, so there is no prior art to copy either.
// Until an engine lane adds the unit, the action carries the printed BASE amount with no scaling,
// which equals the correct value only while this Digimon has 5000-9999 DP (one unit) — its printed
// 7000 DP before any modifier. It under-applies once the buff above pushes it to 10000+ and
// over-applies if it is ever below 5000 DP. `coverage` is "partial" and the sentence is listed in
// `residual`; EX13-020.test.ts keeps the scaling proof as an `it.fails`.
const opponentDpDebuff: Action = {
  kind: "ModifyDP",
  target: opponentDigimon,
  amount: -4000,
  duration: "untilOpponentTurnEnd",
  raw: "to 1 of your opponent's Digimon, give -4000 DP until their turn ends for every 5000 DP this Digimon has",
};

// "1 of your [Free] or [Royal Knight] trait Digimon" names a board filter, not the host, so the
// target is controller-scoped rather than `isSelfRef` (EX13-006's sibling clause). The two
// bracketed tokens are one `nameOrTrait` union with `match: "trait"` — exact trait equality over
// forms ∪ attributes ∪ types (`staticTraitsOf`), which is why the printed ATTRIBUTE [Free] answers
// a "trait" reference while a near-miss such as the [Free Will] type does not. "may" is the
// clause's only optionality, so `optional: true` with no cost.
const unsuspendFreeOrRoyalKnight: Action = {
  kind: "Unsuspend",
  target: {
    filter: {
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Free", "Royal Knight"], match: "trait" }],
    },
    count: 1,
  },
  optional: true,
  raw: "1 of your [Free] or [Royal Knight] trait Digimon may unsuspend",
};

// The three printed timings share ONE [Once Per Turn], so all three windows carry the same
// `sharedUseKey`: the per-turn ledger keys on `EX13-020/ir-shared-buff`, and an on-play activation
// spends the when-digivolving and when-attacking activations too (EX13-012, EX12-024).
const buffEffect = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-buff",
  actions: [selfDpBuff, opponentDpDebuff],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Armor Purge", raw: "＜Armor Purge＞" },
      ],
    },
    buffEffect("OnPlay"),
    buffEffect("WhenDigivolving"),
    buffEffect("WhenAttacking"),
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [unsuspendFreeOrRoyalKnight],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [unsuspendFreeOrRoyalKnight],
    },
  ],
  coverage: "partial",
  residual: ["give -4000 DP until their turn ends for every 5000 DP this Digimon has"],
  digivolutionRequirement: [{ namesExact: ["Veemon"], cost: 3, isAlternate: true }],
  assemblyRequirement: [{ reduceCost: 2, materials: [{ namesExact: ["Veemon"], count: 1 }] }],
};

registerIrCard("EX13-020", compiled);
