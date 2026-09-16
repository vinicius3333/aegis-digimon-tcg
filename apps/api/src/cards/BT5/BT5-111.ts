import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          oncePerTiming: true,
          actions: [
            {
              kind: "EndAttack",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    isSelfRef: true,
                    zone: "digivolutionCards",
                  },
                  count: 2,
                  isSelf: true,
                },
                raw: "by trashing 2 of this Digimon's digivolution cards",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Omnimon"],
      cost: 3,
      isAlternate: true,
      battleAreaOnly: true,
    },
  ],
};

registerIrCard("BT5-111", compiled);
