import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isLinked: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 },
                raw: "By trashing 1 of this Digimon's link cards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
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
              or: [{ zone: "trash" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
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
              levelComparison: {
                op: "lte",
                value: 4,
              },
              or: [{ zone: "trash" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
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
              kind: "GrantStatic",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              grant: "tokenEffect",
              tokens: ["GRANTEFFECT23TOKEN"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
  appFusionRequirement: [
    {
      names: ["Sociamon", "Gossipmon"],
      cost: 0,
    },
  ],
};

registerIrCard("BT21-073", compiled);
