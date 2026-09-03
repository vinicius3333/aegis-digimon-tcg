// HAND-FIXED IR for BT7-017 — do not regenerate.
// WhenDigivolving: PlaceUnder added from:["hand","trash"], underFilter:self, position:top;
// removed misplaced scaling (it belongs on the Delete action). Added Delete action with
// scaling by level 5 Cyborg digivolution cards, gated on PlaceUnder.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              colors: ["Red", "Black"],
              levels: [5],
              nameOrTrait: [
                {
                  tokens: ["Cyborg"],
                  match: "trait",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "top",
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              levels: [5],
              nameOrTrait: [
                {
                  tokens: ["Cyborg"],
                  match: "trait",
                },
              ],
            },
            unit: "digivolutionCards",
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "PlaceUnder resolved",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Machinedramon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT7-017", compiled);
