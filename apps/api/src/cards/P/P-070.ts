// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4171: declining the eligible free play adds that revealed card to hand.
// KB Q4846-Q4847: adding this Security card to hand is an unconditional final process.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          raw: "at the end of the battle",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 1,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Black"],
                    playCostLte: 4,
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
                {
                  filter: { controllerDefault: "mine" },
                  count: "all",
                  to: "hand",
                },
              ],
              rest: "deckBottom",
            },
            { kind: "AddToHandSelf" },
          ],
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-070", compiled);
