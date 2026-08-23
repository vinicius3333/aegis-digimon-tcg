// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              kind: ["Tamer"],
              color: "red",
            },
            count: 1,
            upTo: false,
            isSelf: false,
          },
          from: "hand",
          costSuffix: "2",
          asIf: {
            level: 3,
            color: "red",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["Takuya Kanbara"],
                  match: "name",
                },
              ],
            },
            raw: "a card with [Hybrid] in its traits or [Takuya Kanbara] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    },
  ],
};

registerIrCard("BT7-011", compiled);
