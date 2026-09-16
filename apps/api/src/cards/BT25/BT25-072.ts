import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
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
              hostFilter: { isSelfRef: true },
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                hasLinkRequirement: true,
                nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
              },
            ],
            count: 1,
            source: "thisDigimon",
          },
          from: ["trash", "digivolutionCards"],
          costDelta: -2,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
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
              hostFilter: { isSelfRef: true },
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                hasLinkRequirement: true,
                nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
              },
            ],
            count: 1,
            source: "thisDigimon",
          },
          from: ["trash", "digivolutionCards"],
          costDelta: -2,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                hasLinkRequirement: true,
                nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
              },
            ],
            count: 1,
            source: "thisDigimon",
          },
          from: ["trash", "digivolutionCards"],
          costDelta: -2,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
              restriction: "unsuspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, colors: ["Black"], cost: 4, isAlternate: false },
    { level: 4, colors: ["Purple"], cost: 4, isAlternate: false },
  ],
  appFusionRequirement: [
    {
      names: ["Logamon", "Timemon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT25-072", compiled);
