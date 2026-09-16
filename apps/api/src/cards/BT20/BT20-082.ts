import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          mode: "prevent",
          leaveCause: "byEffect",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Dex", "DeathX"],
                    match: "name",
                  },
                ],
              },
              count: 3,
            },
            position: "bottom",
            raw: "by returning 3 cards with [Dex]/[DeathX] in their names from your trash to the bottom of the deck, it doesn't leave",
          },
          raw: "when this Digimon would leave the battle area by effects, by returning 3 cards with [Dex]/[DeathX] in their names from your trash to the bottom of the deck, it doesn't leave",
        },
      ],
    },
    {
      trigger: "EndOfAllTurns",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: "all",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-082", compiled);
