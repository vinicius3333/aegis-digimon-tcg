import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            orFilters: [{ controllerDefault: "mine", kind: ["Option"], singleColor: true, effectiveUseCostLte: 5 }],
            count: 1,
          },
          from: ["hand"],
          toTop: true,
          revealChosen: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            orFilters: [{ controllerDefault: "mine", kind: ["Option"], singleColor: true, effectiveUseCostLte: 5 }],
            count: 1,
          },
          from: ["hand"],
          toTop: true,
          revealChosen: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -6000,
              duration: "forTheTurn",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -6000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuyamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("LM-023", compiled);
