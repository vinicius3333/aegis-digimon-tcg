import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      isLinked: true,
      keywords: [{ keyword: "Scapegoat", raw: "＜Scapegoat＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
            // The trash branch remains broad; this narrows only the hosted-card
            // branch to this Digimon's own digivolution cards.
            source: "thisDigimon",
          },
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  isSelfRef: true,
                  zone: "linked",
                },
                count: 1,
                upTo: false,
              },
              payCost: false,
              from: ["linked"],
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Roamon", "Effecmon"],
      cost: 0,
    },
  ],
};

registerIrCard("BT22-075", compiled);
export default compiled;
