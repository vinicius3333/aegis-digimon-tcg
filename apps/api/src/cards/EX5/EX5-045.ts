// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Sukamon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "trash",
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's your opponent's turn",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Chuumon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          suspended: true,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Sukamon", "Etemon"],
            raw: "this Digimon had [Sukamon]/[Etemon] in its name",
          },
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-045", compiled);
