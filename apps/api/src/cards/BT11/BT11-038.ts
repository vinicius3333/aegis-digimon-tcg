import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Devimon"], match: "nameExact" }] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon", "Tamer"], colors: ["Purple"] },
            raw: "you have a purple Digimon or purple Tamer in play",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-038", compiled);
