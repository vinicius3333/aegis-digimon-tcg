// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handSmall = { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 };
const ownHand = { controllerDefault: "mine", zone: "hand" };
const opponentHand = { controllerDefault: "opponent", zone: "hand" };

const drawTwoEach = {
  kind: "ConditionalBranch",
  condition: handSmall,
  ifTrue: [
    { kind: "Draw", controller: "mine", amount: 2 },
    { kind: "Draw", controller: "opponent", amount: 2 },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [drawTwoEach] },
    { trigger: "WhenDigivolving", actions: [drawTwoEach] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          cost: { kind: "trash", target: { filter: ownHand, count: 1 } },
          actions: [
            {
              kind: "Trash",
              target: { filter: opponentHand, count: 1 },
              chooser: "opponent",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: ownHand, count: 1 } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-068", compiled);
