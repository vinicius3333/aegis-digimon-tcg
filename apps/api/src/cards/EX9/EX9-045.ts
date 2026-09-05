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
          keyword: "Alliance",
          raw: "＜Alliance＞",
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
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 7,
              nameOrTrait: [
                {
                  tokens: ["WG"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            upTo: true,
          },
          to: "deckBottom",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
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
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["WG"],
                match: "trait",
              },
            ],
          },
          leaveCause: "otherThanBattle",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  playCostLte: 7,
                  nameOrTrait: [
                    {
                      tokens: ["WG"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
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
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Green", level: 6 },
        { color: "Blue", level: 6 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Green", level: 6 },
        { color: "Purple", level: 6 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 6 },
        { color: "Blue", level: 6 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 6 },
        { color: "Purple", level: 6 },
      ],
    },
  ],
};

registerIrCard("EX9-045", compiled);
