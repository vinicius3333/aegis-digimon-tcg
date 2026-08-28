// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3231 (binding): "same name as this Digimon" refers to the name of the Digimon this card
// has digivolved into (the host's top-card name), NOT the name [Keramon].
// Scaling filter uses isSameName:true to compare each candidate with the live source top card.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              isSameName: true,
            },
            unit: "cards",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-044", compiled);
