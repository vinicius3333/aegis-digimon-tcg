// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main] plays Composite Digimon from trash at cost -4, then places this Option in battle area.
// [All Turns] <Delay>: when a Millenniummon would leave, activate the Delay re-activation:
// play 1 Wicked God Digimon from hand/trash at cost = (leaving Digimon's playCost + 1).
// Player may pick 1 Millenniummon to base cost on when multiple would leave simultaneously (Q&A Q3175).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayFromZone",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Composite"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          costReduction: 4,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonWouldLeave",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Millenniummon"],
                match: "name",
              },
            ],
          },
          pickOne: true,
          actions: [
            {
              kind: "PlayFromZone",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Wicked God"],
                      match: "trait",
                    },
                  ],
                  playCost: {
                    op: "eq",
                    relativeToLeavingDigimon: 1,
                  },
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-099", compiled);
