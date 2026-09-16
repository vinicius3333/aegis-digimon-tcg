import type { CompiledCard, CostGatedBlockAction } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashForDrawAndMemory: CostGatedBlockAction = {
  kind: "CostGatedBlock",
  cost: {
    kind: "trash",
    target: {
      filter: {
        zone: "hand",
        controller: "mine",
        nameOrTrait: [
          { tokens: ["Veedramon"], match: "text" },
          { tokens: ["Armor Form", "Free"], match: "trait", orPrevious: true },
        ],
      },
      count: 1,
    },
    raw: "By trashing 1 card with [Veedramon] in its text or the [Armor Form] or [Free] trait from your hand",
  },
  abortOnDecline: true,
  actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "GainMemory", amount: 1 },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-248/start-main-trash-draw-memory",
      trigger: "StartOfYourMainPhase",
      actions: [trashForDrawAndMemory],
    },
    {
      effectKey: "P-248/inherited-your-turn-dp",
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["DemiVeemon"], cost: 0, isAlternate: true }],
};

registerIrCard("P-248", compiled);
