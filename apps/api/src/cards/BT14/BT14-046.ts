// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Green"], zone: "hand" },
          mode: "reduceCost",
          amount: 3,
          cost: {
            kind: "suspend",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], colors: ["Green"], suspended: false },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          mode: "reduceCost",
          amount: 1,
          condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Green"] } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT14-046", compiled);
