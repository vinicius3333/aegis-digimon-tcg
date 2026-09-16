import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, if it's your turn, this Digimon may digivolve into a Digimon card with [Bird]/[Avian] in any of its traits in the hand. For every other suspended Digimon, reduce this effect's digivolution cost by 1.",
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Bird", "Avian"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          reduceCostScaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "any",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, if it's your turn, this Digimon may digivolve into a Digimon card with [Bird]/[Avian] in any of its traits in the hand. For every other suspended Digimon, reduce this effect's digivolution cost by 1.",
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Bird", "Avian"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          reduceCostScaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "any",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-166", compiled);
