// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Hand",
      effectKey: "BT15-002/dp-plus-1000",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "triggerByYourDigimonEffect", raw: "one of your Digimon's effects adds cards to your hand" },
        },
      ],
      condition: { kind: "triggerByYourDigimonEffect", raw: "one of your Digimon's effects adds cards to your hand" },
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-002", compiled);
export { compiled };
