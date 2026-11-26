import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          effectTextPart: "[When Attacking][Once Per Turn] Delete 1 of your opponent's level 4 or lower Digimon.",
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if you have no other Digimon, you may play 1 level 3 purple Digimon card from your trash without paying the cost. Any [On Play] effects on Digimon this effect played don't activate.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levelComparison: { op: "eq", value: 3 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          suppressOnPlayEffects: true,
          condition: {
            kind: "youHaveNone",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true },
            raw: "you have no other Digimon",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD05-08", compiled);
