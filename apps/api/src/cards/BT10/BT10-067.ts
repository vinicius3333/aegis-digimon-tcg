import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 9,
            },
            count: 1,
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                excludeNames: ["Justimon: Critical Arm"],
                controller: "mine",
                zone: "digivolutionCards",
                hostFilter: { isSelfRef: true },
                nameOrTrait: [
                  {
                    tokens: ["Justimon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By returning 1 card with [Justimon] in its name other than [Justimon: Critical Arm] from this Digimon's digivolution cards to its owner's hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            excludeNames: ["Justimon: Critical Arm"],
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Justimon"],
                match: "name",
              },
            ],
          },
          payCost: 2,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Justimon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-067", compiled);
