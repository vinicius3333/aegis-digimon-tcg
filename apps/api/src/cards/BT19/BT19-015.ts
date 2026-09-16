import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 8000 },
            },
            count: 1,
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "this effect didn't delete",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "this effect didn't delete",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 2,
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

registerIrCard("BT19-015", compiled);
