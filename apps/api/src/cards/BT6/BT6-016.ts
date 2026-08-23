// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sistermon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
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
          event: "whenPlayed",
          once: true,
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {},
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Jesmon"], match: "name" }],
                count: "all",
              },
              amount: 3000,
              duration: "forTheTurn",
              continuous: false,
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {},
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Jesmon"], match: "name" }],
                count: "all",
              },
              keyword: {
                keyword: "Piercing",
                raw: "＜Piercing＞",
              },
              duration: "forTheTurn",
            },
          ],
          oncePerTurnKey: "global:BT6-016/jesmon-sistermon",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-016", compiled);
