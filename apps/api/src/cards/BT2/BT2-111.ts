// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT2-111 (Beelzemon).
// Fixes:
// 1. The Static effect placeholder is replaced with a proper YourTurn/Main activated
//    Digivolve ability: while you have 10+ cards in trash, your Impmon in the BATTLE AREA
//    can digivolve into this card in hand for cost 4, ignoring digivolution requirements.
//    KB Q1042 confirms this only works from the battle area (not breeding area).
//    KB Q4212 confirms this works with <Delay> (the option trigger).
// 2. ignoreRequirements:true added to Digivolve action.
// 3. Source zone restricted to battleArea via condition.
// 4. Controller "mine" for the Impmon filter.
// 5. The local digivolutionRequirement entry is omitted; the shared client/server override
//    carries the exact [Impmon] and 10-card trash gates used by direct action validation.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [
                {
                  tokens: ["Impmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            isSelfRef: true,
          },
          from: ["hand"],
          payCost: true,
          costOverride: 4,
          ignoreRequirements: true,
          condition: {
            kind: "selfHasMinTrash",
            count: 10,
            filter: {
              controllerDefault: "mine",
            },
            raw: "while you have 10 or more cards in your trash",
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
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-111", compiled);
