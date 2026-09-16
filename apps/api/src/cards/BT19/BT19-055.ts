import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Knightmon"],
                    match: "text",
                  },
                  {
                    tokens: ["Twilight"],
                    match: "trait",
                    orPrevious: true,
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Knightmon"],
                    match: "text",
                  },
                  {
                    tokens: ["Twilight"],
                    match: "trait",
                    orPrevious: true,
                  },
                ],
              },
              count: 1,
              to: "underTamer",
              requiresMinRevealed: 2,
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-055", compiled);
