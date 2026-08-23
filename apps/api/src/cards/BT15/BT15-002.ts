// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenEffectAddsToHand",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "triggerByYourDigimonEffect",
            raw: "one of your Digimon's effects adds cards to your hand",
          },
        },
      ],
      // The cause gate belongs to the EFFECT, not just its action: an add-to-hand that was not
      // driven by one of your Digimon's effects must not even be collected at the window.
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
