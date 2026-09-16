import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["hand", "digivolutionCards"],
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
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["hand", "digivolutionCards"],
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
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["hand", "digivolutionCards"],
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
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
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
              kind: "Return",
              target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
              to: "deckBottom",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, colors: ["Green"], cost: 4, isAlternate: false },
    { level: 4, colors: ["Yellow"], cost: 4, isAlternate: false },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
  appFusionRequirement: [
    {
      names: ["Logimon", "Craftmon"],
      cost: 0,
    },
  ],
};

registerIrCard("BT25-056", compiled);
