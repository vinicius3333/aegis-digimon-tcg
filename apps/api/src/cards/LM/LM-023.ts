// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it.
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
            // Q5516: this is the effective use cost from hand, after reductions,
            // rather than the Option's printed play cost.
            orFilters: [{ controllerDefault: "mine", kind: ["Option"], singleColor: true, effectiveUseCostLte: 5 }],
            count: 1,
          },
          from: ["hand"],
          toTop: true,
          // Q4025: the chosen card is revealed to the opponent before it is placed face down.
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
          // Q4025: the chosen card is revealed to the opponent before it is placed face down.
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
          // "when a card is added to A security stack" names no owner, so either player's
          // stack arms the clause; the previous gate limited it to the controller's own.
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
