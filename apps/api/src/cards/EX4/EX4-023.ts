// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              from: ["hand"],
              controller: "mine",
              source: "revealed",
              toTop: true,
              cost: {
                kind: "reveal",
                target: {
                  filter: { zone: "hand", controller: "mine", levelEqTriggerSource: true },
                  count: 1,
                  from: ["hand"],
                },
                raw: "by revealing 1 card of the same level in your hand",
              },
              optional: true,
              abortOnDecline: true,
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

registerIrCard("EX4-023", compiled);
