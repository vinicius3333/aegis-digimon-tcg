// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [{
    trigger: "OnPlay",
    actions: [{
      kind: "Return",
      target: {
        filter: { controller: "mine", zone: "hand", colors: ["Green"], kind: ["Digimon"] },
        count: 1,
      },
      to: "deckTop",
      optional: true,
      raw: "You may reveal 1 green Digimon card from your hand and place it on top of your deck.",
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-043", compiled);
