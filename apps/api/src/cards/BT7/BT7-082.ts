// HAND-FIXED IR — the Sistermon Blanc paid as cost is placed under this Digimon.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Sistermon Blanc"],
                    match: "nameExact",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            raw: "by placing 1 [Sistermon Blanc] from your hand or trash at the bottom of this Digimon's digivolution cards",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              excludeNames: ["Sistermon Blanc (Awakened)"],
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Jesmon", "Huckmon"],
                  match: "name",
                },
                {
                  tokens: ["Sistermon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-082", compiled);
