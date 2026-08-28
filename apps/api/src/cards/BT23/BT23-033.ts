// @ts-nocheck
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
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
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
          },
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
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 5,
                raw: "you have 5 or fewer security cards",
              },
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -1000,
              duration: "untilOpponentTurnEnd",
              scaling: {
                per: 1,
                filter: {
                  controller: "mine",
                },
                unit: "security",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              restriction: "cannotReturnToHandOrDeck",
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "protection",
              tokens: ["beDeDigivolved"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Coordemon", "Consulmon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ cost: 3, traits: ["Appmon"] }],
};

registerIrCard("BT23-033", compiled);
