// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT7-109 (Dead or Alive).
// Text: [Main] Play 1 purple level 5 Digimon from your trash without paying its memory cost.
// If there are 10 or more cards in your trash, you may play 1 Digimon card with [Lucemon]
// in its name without paying its memory cost instead.
// KB Q1676 confirms the alternative play is optional and requires 10+ cards in trash.
// The second action is "instead" of the first — conditional on 10+ trash cards.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levels: [5],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "there are 10 or more cards in your trash",
          },
          instead: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-109", compiled);
