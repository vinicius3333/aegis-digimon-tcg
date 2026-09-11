import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-030 Reppamon (Digimon, Yellow, Lv.4 Champion [Holy Beast]/[DATA SQUAD], Vaccine,
// 5000 DP, play cost 5, printed EvoCost Yellow Lv.3 for 2).
//
// Printed main text:
//   [Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2
//   ＜Barrier＞
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing your top
//     security card, you may play 1 [Richard Sampson] from your hand or trash without
//     paying the cost.
// Printed inherited text:
//   ＜Barrier＞
// No printed security text.
//
// No KB rulings exist for this card — EX13 is pre-release, so `tools/kb/query.mjs card EX13-030`
// reports no entries. General rules consulted:
//   - comprehensive §16-25-1/§16-25-2 ＜Barrier＞: a battle-deletion-only immediate-type
//     prevention paid by trashing the top card of the controller's security stack. The engine
//     models it exactly that way (`respondBarrier`; effect deletions never open the prompt), so
//     the keyword needs no actions of its own beyond the `keywords` marker.
//   - manual §1 [X Per Turn]: choosing to perform a "by" condition is what spends the use, so a
//     declined window must leave the quota untouched, and a "by" condition can never be paid
//     partly (an empty security stack makes the whole clause do nothing).
//
// The alternate [Digivolve] header is a `digivolutionRequirement` entry, not an effect. The
// printed cost (2) equals the catalog EvoCost's cost, so the header's only widening is the
// source predicate: ANY colour Lv.3 carrying the exact [DATA SQUAD] trait, where the catalog
// EvoCost needs a YELLOW Lv.3 regardless of trait. `traits` is exact trait matching ("with the
// [X] trait"), so a Lv.3 whose trait is merely [Data] does not reach this card — same shape as
// BT26-027's "Lv.3 w/[WG] trait: Cost 2" sibling.
//
// The three printed timings share ONE [Once Per Turn], so all three windows carry the same
// `sharedUseKey`: an [On Play] activation spends the digivolve and attack activations too
// (P-187, the same printed sentence with a different play target; EX13-014, EX13-012).
//
// "By trashing your top security card, you may play 1 [Richard Sampson] ... without paying the
// cost" is one cost-bearing `PlayWithoutCost`, copied from P-187's identical clause rather than
// an EX10-041-style `CostGatedBlock`: the cost belongs to the play, so the interpreter's
// no-legal-candidate preflight (`runAction.ts`, "Do not offer an optional play when no legal
// loose card exists") drops the whole clause before the security card is spent when no
// [Richard Sampson] is reachable. A wrapper block would pay first and discover the empty target
// afterwards. `abortOnDecline: true` keeps the unpayable/declined case from leaking into any
// later action of the same effect.
//
// "[Richard Sampson]" is a bracketed EXACT name (`nameExact`), and the printed sentence has no
// card-kind or colour qualifier, so the filter carries neither: both catalog printings
// (BT13-098 and EX13-071) qualify. `controller: "mine"` plus `from: ["hand", "trash"]` is the
// printed pool "your hand or trash".
const richardSampson: Filter = {
  controller: "mine",
  nameOrTrait: [{ tokens: ["Richard Sampson"], match: "nameExact" }],
};

const playRichardSampson = (): Action => ({
  kind: "PlayWithoutCost",
  target: { filter: richardSampson, count: 1 },
  from: ["hand", "trash"],
  payCost: false,
  cost: {
    kind: "trash",
    target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
    raw: "By trashing your top security card",
  },
  optional: true,
  abortOnDecline: true,
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [playRichardSampson()],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [playRichardSampson()],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [playRichardSampson()],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true }],
};

registerIrCard("EX13-030", compiled);
