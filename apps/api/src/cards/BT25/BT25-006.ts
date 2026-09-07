import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Titan"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                  },
                  count: 1,
                },
                raw: "by trashing 1 card in your hand",
              },
              optional: true,
              abortOnDecline: true,
              preserveOncePerTurnOnDecline: true,
              allowCostWithoutTarget: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-006", compiled);
