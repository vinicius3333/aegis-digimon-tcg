import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, you may play 1 Tamer card with the [Night Claw]/[Light Fang] trait from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Night Claw", "Light Fang"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
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

registerIrCard("EX5-067", compiled);
