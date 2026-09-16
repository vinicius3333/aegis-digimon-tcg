import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          raw: "when you play a blue Tamer, draw 1",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          actions: [
            {
              kind: "Return",
              target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
              to: "hand",
            },
          ],
          raw: "when an effect adds a card to your hand, return 1 opposing level 3 Digimon",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-021", compiled);
