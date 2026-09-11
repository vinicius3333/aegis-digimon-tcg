import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-019 Veedramon (Digimon, Blue, Lv.4 Champion [Mythical Dragon]/[CS], Vaccine).
// Printed main text:
//   [Digivolve] Lv.3 w/[CS] trait: Cost 2
//   ＜Jamming＞
//   [When Attacking] [Once Per Turn] You may play 1 Tamer card with [Veedramon] in its text
//   from your hand with the cost reduced by 2.
// Printed inherited text:
//   ＜Jamming＞
//
// The alternate [Digivolve] header is a `digivolutionRequirement` entry, not an effect.
// "w/[CS] trait" is the EXACT trait reading (`traits`, not `traitSubstrings`), the same shape
// EX12-024 uses for its "w/[NSo]/[VB] trait" alternate and BT24-059 for "w/[TS] trait" —
// a two-letter trait token would otherwise match [CS] inside unrelated traits. Its cost (2)
// coincides with the catalog EvoCost (Blue Lv.3 cost 2), so the alternate's only job is to
// widen the legal base pool past blue: a RED Lv.3 with the [CS] trait (BT22-008 Agumon)
// reaches this card, while a red Lv.3 without [CS] (BT1-010) does not.
//
// ＜Jamming＞ is a printed keyword outside any timing window (comprehensive 16-9: a persistent
// effect, "isn't deleted as a result of a battle with an opponent's Security Digimon"), so it
// compiles to a `Static` window carrying only `keywords` — the accepted form in BT1-016 and
// EX12-024/EX12-030. The printed inherited copy is the same window with `isInherited: true`,
// so the keyword reaches a Digimon that digivolves on top of this card; the non-inherited copy
// deliberately does NOT (BT1-016's "does not confer Jamming when it is a digivolution card").
//
// The body is a single printed verb ("play"), so one `PlayWithoutCost` — no Modal, unlike
// EX13-012's "play or use". `payCost: true` with `reduceCostBy: 2` scopes the discount to the
// one card this activation chooses; a `wouldBePlayed` reduceCost replacement would instead
// install an unscoped subscription discounting every play in the window.
//
// "1 Tamer card" is a kind predicate, so `kind: ["Tamer"]` — a Digimon that also prints
// [Veedramon] in its text (EX13-017 Veemon) is refused by kind, not by the token.
//
// "with [Veedramon] in its text" is the substring reading over the full printed-information
// union (`match: "text"`, comprehensive 4-22-1; cf. EX13-011/EX13-012's "w/[Huckmon] in text"),
// so a Tamer NAMED or TRAITED Veedramon would qualify too. It must discriminate against the
// near-miss token "[Vee]": BT2-086 Rina Shinomiya prints "[Vee]" and no "Veedramon", so it is
// NOT a legal choice even though "Vee" is a prefix of "Veedramon".
//
// One printed [Once Per Turn] over one printed timing, so a plain `frequency: "OncePerTurn"`
// with no `sharedUseKey` (that is only needed when two windows share one printed gate).
const playVeedramonTamer: Action = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      zone: "hand",
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: true,
  reduceCostBy: 2,
  optional: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [playVeedramonTamer],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }],
};

registerIrCard("EX13-019", compiled);
