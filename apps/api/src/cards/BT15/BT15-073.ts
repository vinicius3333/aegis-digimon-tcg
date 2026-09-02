import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving][On Deletion] (Draw 1 card from your deck). Then, trash 1 card in your hand.
// The inherited effect is scoped to the battle deletion payload and resolves against the
// per-instance battle-opponent binding captured by the combat resolver.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            sourceRef: "battleOpponent",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "triggerRemovalCause",
            removalCause: "byBattle",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT15-073", compiled);
export { compiled };
