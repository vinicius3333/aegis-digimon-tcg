import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Palmon"],
                  match: "nameExact",
                },
              ],
            },
            from: ["trash"],
            count: 1,
          },
          underFilter: {
            controller: "mine",
            colors: ["Green"],
            kind: ["Digimon"],
          },
          position: "bottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-047", compiled);
