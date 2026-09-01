// @ts-nocheck
// HAND-FIXED IR for BT19-024 — do not regenerate.
// Added AllTurns Replacement implementing <Decode (Blue Lv.4)>: when this Digimon
// would leave the battle area other than by battle, play 1 Blue Lv.4 from its
// digivolution cards without paying the cost (per comprehensive rules §16-36-1).
// The "return 1 opponent Lv.≤5 Digimon to hand" seen in Q&A Q3058 is the OnPlay
// of the Blue Lv.4 card being played, not part of this card's Decode effect.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Blue Lv.4)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Aqua", "Sea Animal"],
                  match: "traitContains",
                },
              ],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Aqua", "Sea Animal"],
                  match: "traitContains",
                },
              ],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  isSelfRef: true,
                  colors: ["Blue"],
                  levelComparison: {
                    op: "eq",
                    value: 4,
                  },
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              isSelfRef: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Aqua", "Sea Animal"],
                  match: "traitContains",
                },
              ],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-024", compiled);
