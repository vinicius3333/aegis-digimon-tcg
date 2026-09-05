// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Nene Amano"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Nene Amano"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you don't have [Nene Amano] in play",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-040", compiled);
