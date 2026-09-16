import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", controller: "any", revealCount: 5, add: [], rest: "deckTopOrBottom" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "RevealAdd", controller: "any", revealCount: 5, add: [], rest: "deckTopOrBottom" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-068", compiled);
