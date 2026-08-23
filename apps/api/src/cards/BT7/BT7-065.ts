// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          scaling: {
            per: 1,
            unit: "digivolutionCards",
            filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] },
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] },
            from: ["hand"],
            count: 1,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 0,
              playCostLteScaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true } },
            },
            count: 2,
            upTo: true,
          },
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-065", compiled);
