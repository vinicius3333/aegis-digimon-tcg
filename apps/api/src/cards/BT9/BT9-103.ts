import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-103 Kongou
// [Main] Until the end of your opponent's turn:
//   1. Your opponent's Digimon with play costs of 7 or less can't attack players.
//   2. Cards can't be added to security stacks by your opponent's effects.
// KB Q1908: "cards can't be added to security stacks" is a blanket prohibition on
//   adding cards via effects, regardless of card type/level. Encoded as GlobalRestrict
//   (new capability — LANE_E.md CAP-E-04).
// [Security] Activate [Main].
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 7,
            },
            count: "all",
          },
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GlobalRestrict",
          restriction: "opponentCannotAddToSecurity",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-103", compiled);
