// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "ModifyDP",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                amount: 2000,
                duration: "forTheTurn",
              },
            ],
            [
              {
                kind: "Unsuspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
            ],
            [
              {
                kind: "Delete",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    playCostLte: 5,
                  },
                  count: 1,
                },
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ReactivateEffect",
          fromTrigger: "WhenDigivolving",
          count: 1,
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-038", compiled);
