// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT2-041 suspends all yellow Tamers and applies a separate -4000 DP choice for each Tamer
// suspended; its inherited effect grants +1000 DP per yellow Tamer in play.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            count: "all",
          },
          trackCount: "suspendedThisEffect",
        },
        {
          kind: "RepeatPerCount",
          countSource: "suspendedThisEffect",
          action: {
            kind: "ModifyDP",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            amount: -4000,
            duration: "forTheTurn",
          },
          raw: "For each Tamer you suspend this way, 1 of your opponent's Digimon gets -4000 DP for the turn",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
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
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-041", compiled);
