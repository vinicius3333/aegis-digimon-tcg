import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT5-030 (Neptunemon).
// Fix: restriction must be 'cantBeAttacked' not 'attack'.
// Also adds opponent-turn gate (documented behavior — Condition checks IsOpponentTurn).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "cantBeAttacked",
          duration: "permanent",
          condition: {
            kind: "isOpponentsTurn",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-030", compiled);
