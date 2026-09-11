import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-031 KingSukamon (Yellow, Lv.5 Ultimate [Mutant], Virus, play cost 7, DP 7000).
// Printed EvoCosts are dual — Yellow Lv.4 cost 3 and Black Lv.4 cost 3 — and both are carried by
// the catalog, so no `digivolutionRequirement` entry is needed (the card prints no [Digivolve]
// header; contrast the two earlier KingSukamon, BT11-043 and BT13-069, whose alternate route IS
// printed).
//
// [Assembly -4] 3 Lv.4 or lower Digimon cards w/[Sukamon] in name
//   One material slot of `count: 3`: the header names a single requirement repeated three times,
//   with no "different names"/"different levels" qualifier, so three copies of the same Sukamon
//   are legal (contrast EX12-060 `differentNames` and BT26-047 `differentLevels`). `levelMax: 4`
//   is "Lv.4 or lower", `kinds: ["Digimon"]` is "Digimon cards", and `names: ["Sukamon"]` is the
//   SUBSTRING reading of "w/[Sukamon] in name" — PlatinumSukamon qualifies, exactly as on the
//   "Lv.4 w/[Sukamon] in name" digivolution requirements of BT11-043/BT13-069. Materials come
//   from the trash (comprehensive §7-3-1) and stack top-down in the header's left-to-right order
//   (§7-3-2-6); both are engine-owned, not card-owned.
//
// [On Play] [When Digivolving] [On Deletion] By trashing 1 card with [Chuumon] or [Sukamon] in its
// name from your hand or your Digimon's digivolution cards, you may change the base name, color
// and DP of 1 of your opponent's Digimon to [Sukamon], white and 3000 until their turn ends.
//   Three printed timings, no [Once Per Turn], so three independent effects sharing one action
//   list and NO `sharedUseKey` (contrast EX12-060/EX13-014, which print one pooled [Once Per
//   Turn] across their windows).
//
//   The payload is the "effect that changes information" of comprehensive §15-12-2, whose own
//   worked example is this very rewrite: `GrantStatic` with the `{originalName, color, dp}` object
//   grant, which is how BT11-043 (the BT11 KingSukamon) and BT14-097 encode the identical
//   sentence. No separate `SetBaseDP` is needed — the grant's `dp` is what the continuous layer
//   reads for `currentDP` (BT11-043 carries no `SetBaseDP` and still reports 3000). "until their
//   turn ends" is the opponent's turn end, `duration: "untilOpponentTurnEnd"`.
//
//   The cost pool "from your hand or your Digimon's digivolution cards" is BT11-041's
//   `zone: ["hand", "digivolutionCards"]` trash cost — but WITHOUT its `hostFilter: {isSelfRef:
//   true}`, because this card says "your Digimon's" (any stack the controller owns) where BT11-041
//   says "this Digimon's" (the resolving source only). "with [Chuumon] or [Sukamon] in its name"
//   is one OR-list of substring name tokens (`tokens` is a disjunction; two separate refs would
//   read as a conjunction), so Geremon — which prints [Numemon]/[Sukamon] only in its TEXT — is
//   refused.
//
//   "By [cost], you may [effect]" is the optional processing condition of comprehensive §15-7:
//   the player CHOOSES whether to execute the condition, and if it is not executed the following
//   processing cannot be (§15-7-1/§15-7-2). That is one decision, so the action carries
//   `optional: true` with a mandatory-once-accepted cost and `abortOnDecline: true` — the
//   BT11-041 shape for the same archetype. It deliberately does NOT use
//   `payCostBeforeOptional`, which would make the trash unconditional; that flag belongs to the
//   cards whose KB rulings pre-commit the cost (Q2813/Q2853, BT17-059/BT17-080), and no such
//   ruling exists for this pre-release card.
//
// [Inherited] [All Turns] [Once Per Turn] When any other Digimon with [Sukamon] in their names are
// deleted, reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower Digimon card
// with [Chuumon] or [Sukamon] in its name among them without paying the cost. trash the rest.
//   An `onDeletionOf` SubTrigger, the EX13-013 inherited-watcher shape. The sentence carries no
//   controller qualifier ("any other Digimon"), so `controller: "any"` — either side's Sukamon
//   arms it — and "other" is `excludeSelf: true`. The printed [Once Per Turn] is the effect's
//   `frequency`.
//
//   The body is `RevealAdd` with a single `to: "play"` slot: `playCostLte: 3` is "play cost 3 or
//   lower", `optional: true` is "You may", the absence of `costDelta` keeps the play fully free
//   ("without paying the cost"), and `rest: "trash"` is "trash the rest" — the EX5-045 encoding of
//   the same reveal-and-free-play sentence, with EX13-027's `controllerDefault: "mine"` on the
//   revealed-card filter because a revealed deck card has no controller of its own yet.
const chuumonOrSukamonNamedCost: Filter = {
  controller: "mine",
  zone: ["hand", "digivolutionCards"],
  nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
};

const rewriteOneOpponentDigimon = (): Action => ({
  kind: "GrantStatic",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  grant: { originalName: "Sukamon", color: "white", dp: 3000 },
  duration: "untilOpponentTurnEnd",
  cost: {
    kind: "trash",
    target: { filter: chuumonOrSukamonNamedCost, count: 1 },
    raw: "By trashing 1 card with [Chuumon] or [Sukamon] in its name from your hand or your Digimon's digivolution cards",
  },
  optional: true,
  abortOnDecline: true,
  raw: "you may change the base name, color and DP of 1 of your opponent's Digimon to [Sukamon], white and 3000 until their turn ends",
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [rewriteOneOpponentDigimon()] },
    { trigger: "WhenDigivolving", actions: [rewriteOneOpponentDigimon()] },
    { trigger: "OnDeletion", actions: [rewriteOneOpponentDigimon()] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "any",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
          },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    playCostLte: 3,
                    nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "trash",
            },
          ],
          raw: "When any other Digimon with [Sukamon] in their names are deleted, reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower Digimon card with [Chuumon] or [Sukamon] in its name among them without paying the cost. trash the rest.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    { reduceCost: 4, materials: [{ count: 3, kinds: ["Digimon"], names: ["Sukamon"], levelMax: 4 }] },
  ],
};

registerIrCard("EX13-031", compiled);
