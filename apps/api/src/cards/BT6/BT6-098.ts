import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The two printed branches have different target filters and destinations. Each
// branch binds its chosen Digimon, then Return moves only that Digimon to the printed
// destination and performs the rules cleanup for its stack. Per Q1399, the cleanup
// must not emit an effect-driven whenDigivolutionTrashed event.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "opponentHas",
            filter: {
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 3,
            raw: "if your opponent has 3 or more Digimon in play",
          },
          ifTrue: [
            {
              kind: "SelectBind",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: 1,
                bindAs: "raddleTarget",
              },
            },
            {
              kind: "Return",
              target: { filter: {}, count: 1, fromSelectionRef: "raddleTarget" },
              to: "deckBottom",
            },
          ],
          ifFalse: [
            {
              kind: "SelectBind",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                },
                count: 1,
                bindAs: "raddleTarget",
              },
            },
            {
              kind: "Return",
              target: { filter: {}, count: 1, fromSelectionRef: "raddleTarget" },
              to: "hand",
            },
          ],
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

registerIrCard("BT6-098", compiled);
