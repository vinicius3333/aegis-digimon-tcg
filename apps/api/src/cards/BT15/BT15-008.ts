import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Red"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: { kind: "attackTargetsPlayer", raw: "a red Digimon attacks a player" },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-008", compiled);
export { compiled };
