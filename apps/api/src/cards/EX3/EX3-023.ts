// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX3-023 (errata 2022-11-11 and Q2109).
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
              orFilters: [
                {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                  traitContains: ["Aqua", "Sea Animal"],
                  hostFilter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Blue"],
                  },
                },
              ],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            fromDigivolution: true,
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelEqTriggerSource: true,
                },
                count: 1,
              },
              to: "deckBottom",
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-023", compiled);
