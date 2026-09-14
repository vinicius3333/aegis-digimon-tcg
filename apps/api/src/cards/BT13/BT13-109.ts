import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Delete 1 of your opponent's level 6 or higher Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: 6,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, 1 of your Digimon may digivolve into [Belphemon: Sleep Mode] from your trash without paying the cost.",
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Belphemon: Sleep Mode"],
                match: "nameExact",
              },
            ],
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: {
                attr: "level",
                op: "lte",
                selectionRef: "trashedHandDigimon",
              },
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            bindResultAs: "trashedHandDigimon",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By trashing 1 Digimon card in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-109", compiled);
