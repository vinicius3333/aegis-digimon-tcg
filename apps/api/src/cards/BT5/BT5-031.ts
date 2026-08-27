import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT5-031 (MetalGarurumon).
// The printed source-trash clause is explicit effect processing, so bind the target and
// run TrashDigivolution before Return. Automatic attachment movement during Return does
// not emit the source-trash event required by inherited watchers.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["On Deletion"],
                  match: "text",
                },
              ],
            },
            count: 1,
            bindAs: "metalGarurumonReturnTarget",
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Garurumon"],
                  match: "name",
                },
              ],
              excludeNames: ["KendoGarurumon"],
            },
            raw: "a Digimon card with [Garurumon] in its name other than [KendoGarurumon] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "TrashDigivolution",
          target: { filter: {}, count: 1, fromSelectionRef: "metalGarurumonReturnTarget" },
          amount: 99,
        },
        {
          kind: "Return",
          target: { filter: {}, count: 1, fromSelectionRef: "metalGarurumonReturnTarget" },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-031", compiled);
