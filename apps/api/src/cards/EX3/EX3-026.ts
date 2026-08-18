// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX3-026 (errata 2022-11-11).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levels: [3],
              hostFilter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
              },
            },
            count: 1,
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Seadramon"],
                    match: "name",
                  },
                ],
                hostFilter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                },
              },
              {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "trait",
                  },
                ],
                hostFilter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                },
              },
            ],
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "ActivateEffect",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              effectType: "WhenDigivolving",
              optional: true,
              preserveOncePerTurnOnDecline: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-026", compiled);
