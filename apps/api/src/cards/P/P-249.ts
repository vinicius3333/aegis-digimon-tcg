import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for P-249 (Strabimon; Yellow Lv.3 Hybrid Beastkin).
//
// [Start of Your Main Phase] By placing 1 card with the [Hybrid] trait from your hand or trash
// as this Digimon's bottom digivolution card or under any of your Tamers with inherited effects,
// that Digimon or Tamer may digivolve into a [Hybrid] trait Digimon card in the hand with the
// cost reduced by 2.
// [Inherited] [On Deletion] You may play 1 Tamer card with inherited effects from your hand
// without paying the cost.
//
// Encoding notes:
//   * The placement is a printed COST ("By placing ..."), and only the digivolve that follows is
//     optional ("may digivolve"). A plain optional Digivolve carrying `cost` would prompt BEFORE
//     the placement and then force the evolution once paid, so the clause is modelled as a
//     CostGatedBlock exactly like BT14-090's "By placing ..., that Digimon may digivolve" text.
//   * `optional` + `abortOnDecline` on the block is the house encoding for a
//     [Start of Your Main Phase] "By <cost>, <effect>" clause (BT18-090, BT18-091, P-242): the
//     controller is asked once before paying, and declining leaves the board untouched.
//   * The two printed destinations are one host selection: the source Digimon itself
//     (`underFilter`) unioned with any of the controller's Tamers that have inherited effects
//     (`underOrFilters`). BT21-013 prints the same "as this Digimon's bottom digivolution card or
//     under any of your red Tamers with inherited effects" destination pair; `hasInheritedEffects`
//     is the same predicate BT18-090/BT18-091 use for "Tamer card with inherited effects".
//   * `bindHostAs` / `fromSelectionRef` make "that Digimon or Tamer" the host that actually
//     received the placement, rather than a free re-selection (BT14-090, EX6-007).
//   * The printed cost is "1 card with the [Hybrid] trait", not "1 Digimon card", so the placed
//     card's filter carries no `kind`. "Hybrid" is a FORM on these cards and the engine's trait
//     set is `[...types, ...forms, ...attributes]` (engine/effects/detach.ts), so `match: "trait"`
//     reaches it.
//   * The digivolve is paid, not free: the printed text only reduces the cost and never waives
//     digivolution requirements, so `payCost: true` keeps the requirement gate on and
//     `reduceCost: 2` belongs to this digivolve rather than a sibling replacement (BT21-013,
//     BT21-082).
const hybridTrait = [{ tokens: ["Hybrid"], match: "trait" as const }];

export const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-249/start-main-place-hybrid-then-digivolve",
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: hybridTrait,
              },
              count: 1,
              from: ["hand", "trash"],
            },
            underFilter: {
              isSelfRef: true,
            },
            underOrFilters: [
              {
                controller: "mine",
                kind: ["Tamer"],
                hasInheritedEffects: true,
              },
            ],
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            bindHostAs: "p249PlacementHost",
            raw: "By placing 1 card with the [Hybrid] trait from your hand or trash as this Digimon's bottom digivolution card or under any of your Tamers with inherited effects",
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
                fromSelectionRef: "p249PlacementHost",
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: hybridTrait,
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          optional: true,
          abortOnDecline: true,
          raw: "[Start of Your Main Phase] By placing 1 card with the [Hybrid] trait from your hand or trash as this Digimon's bottom digivolution card or under any of your Tamers with inherited effects, that Digimon or Tamer may digivolve into a [Hybrid] trait Digimon card in the hand with the cost reduced by 2.",
        },
      ],
    },
    {
      effectKey: "P-249/inherited-on-deletion-play-tamer",
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              hasInheritedEffects: true,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          raw: "[On Deletion] You may play 1 Tamer card with inherited effects from your hand without paying the cost.",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-249", compiled);
