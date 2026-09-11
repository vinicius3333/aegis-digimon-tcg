import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-042 Bastemon (Digimon, Green, Lv.5 Ultimate [Beastkin], Virus, 7000 DP, play cost 7).
// Printed main text:
//   ＜Alliance＞
//   [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 play cost 4 or lower
//   Digimon card with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its
//   traits from your hand without paying the cost.
// Printed inherited text:
//   ＜Alliance＞
//
// The catalog prints no [Digivolve] header, so there is no `digivolutionRequirement`: the only
// route in is the EvoCost (Green Lv.4, cost 3) or the printed play cost 7.
//
// ＜Alliance＞ is a keyword effect outside any timing window (comprehensive §16-24-1: "When a
// Digimon with this effect attacks, by suspending 1 of your other Digimon, add the suspended
// Digimon's DP to the attacking Digimon and it gains ＜Security A. +1＞ for the attack"), so it
// compiles to a `Static` window carrying only `keywords` — the EX13-019/BT1-016 shape. It is
// printed TWICE, once in the main box and once as inherited text, so there are two such windows:
// the bare one applies only while this card is the top card, and the `isInherited: true` twin
// passes the keyword up to whatever digivolves on top of it (ST20-04 encodes the inherited copy
// the same way).
const allianceKeyword = { keyword: "Alliance", raw: "＜Alliance＞" } as const;

// "play cost 4 or lower Digimon card ... from your hand" — a loose-card gate, so the printed play
// cost is read off the definition (`playCostLte`, handled for hand candidates in
// `matching/definition.ts:154`). No `totalPlayCostBudget` is involved (one card, one cap), so the
// loose-path budget seam recorded in REVIEW-NOTES.md for EX13-035 does not apply here.
//
// "with [Beast], [Animal] or [Sovereign] ... in any of its traits" is the SUBSTRING trait reading
// ("in any of its traits", not "with the [X] trait"), so `match: "traitContains"`. The three tokens
// sit in one union entry because the printed clause ORs them. The substring reading is what makes
// the printed exclusion necessary: [Sea Animal] contains "Animal", and [Sea Beast]/[Holy Beast]/
// [Rare Animal]/[Dark Animal]/[Four Sovereigns] are exactly the families this widening is for.
//
// "other than [Sea Animal]" therefore subtracts that one family back out: `excludeNameOrTrait`
// (definition.ts:190) is the name/trait-spanning exclusion, and it keeps the substring mode so a
// hypothetical compound "Sea Animal"-bearing trait is excluded too.
const playableBeast: Filter = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Digimon"],
  playCostLte: 4,
  nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
};

// "without paying the cost" ⇒ `payCost: false` (EX13-013/EX13-030 shape). "You may" ⇒ `optional`.
const playBeastFromHand = (): Action => ({
  kind: "PlayWithoutCost",
  target: { filter: playableBeast, count: 1 },
  from: ["hand"],
  payCost: false,
  optional: true,
});

// One printed [Once Per Turn] governs BOTH printed timings, so the two windows share a single
// use ledger through `sharedUseKey` (BT26-016/BT26-031 shape). A plain `frequency` on each window
// would wrongly allow one activation per timing.
const SHARED_USE_KEY = "EX13-042/play-beast";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [allianceKeyword] },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: [playBeastFromHand()],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: [playBeastFromHand()],
    },
    { trigger: "Static", actions: [], isInherited: true, keywords: [allianceKeyword] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-042", compiled);
