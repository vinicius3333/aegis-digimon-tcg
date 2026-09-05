// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Arisa Kinosaki"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "battleArea",
            filter: { kind: ["Tamer"] },
            op: "lte",
            value: 1,
            raw: "you have 1 or fewer Tamers",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -3000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-025", compiled);
