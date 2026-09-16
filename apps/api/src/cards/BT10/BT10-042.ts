import type { CompiledCard, RestrictAction } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const restrictToSource = {
  kind: "Restrict",
  target: {
    filter: {
      controller: "opponent",
      kind: ["Digimon"],
      keywords: ["SecurityAttack"],
    },
    count: "all",
  },
  restriction: "attack",
  specificTarget: "source",
  duration: "permanent",
} satisfies RestrictAction & { specificTarget: "source" };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        restrictToSource,
        {
          kind: "DisableTimingEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              keywords: ["SecurityAttack"],
            },
            count: "all",
          },
          timings: ["whenDigivolving", "whenAttacking"],
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT10-042", compiled);
