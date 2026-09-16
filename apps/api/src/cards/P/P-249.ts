import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
