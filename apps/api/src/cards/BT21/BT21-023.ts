import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
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
              levelComparison: {
                op: "lte",
                value: 4,
              },
              hasLinkRequirement: true,
              or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
          from: ["hand", "digivolutionCards"],
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
              levelComparison: {
                op: "lte",
                value: 4,
              },
              hasLinkRequirement: true,
              or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
          from: ["hand", "digivolutionCards"],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    relativeToSource: true,
                  },
                },
                count: 1,
              },
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
      names: ["DoGatchmon", "Timemon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT21-023", compiled);
