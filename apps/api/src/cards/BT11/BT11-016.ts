import type { CompiledCard, Scaling } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const redTamerScaling = {
  per: 1,
  bonus: 2000,
  filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Red"] },
  unit: "cards",
} satisfies Scaling;

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "ReactivateEffect", fromTrigger: "OnDeletion", count: 1, optional: true }],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red"],
              dpAtMost: 3000,
              dpAtMostScaling: redTamerScaling,
              nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
              excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-016", compiled);
