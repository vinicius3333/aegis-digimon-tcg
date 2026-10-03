import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          effectTextPart:
            "[Your Turn] [Once Per Turn] When one of your Digimon moves from the breeding area to the battle area, reveal the top 3 cards of your deck. Add 1 Digimon card or Tamer card among them to the hand. Return the rest to the bottom of the deck.",
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [{ filter: { kind: ["Digimon", "Tamer"] }, count: 1, to: "hand" }],
              rest: "deckBottom",
            },
            { effectTextPart: "Then, you may hatch in your breeding area.", kind: "Hatch", optional: true },
          ],
          raw: "when one of your Digimon moves from breeding to battle",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-082", compiled);
