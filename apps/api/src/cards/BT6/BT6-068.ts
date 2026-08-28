// @ts-nocheck
// HAND-FIXED IR — the return is gated by whether the optional hand trash resolved.
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
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
            bindResultAs: "discardedCard",
          },
          optional: true,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Seven Great Demon Lords", "Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "bindingExists",
            ref: "discardedCard",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-068", compiled);
