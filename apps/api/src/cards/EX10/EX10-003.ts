import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    isSelfRef: true,
                    zone: "digivolutionCards",
                    nameOrTrait: [
                      {
                        tokens: ["Mineral", "Rock"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 3,
                },
                raw: "by trashing 3 [Mineral] or [Rock] trait cards from this Digimon's digivolution cards",
              },
              optional: true,
              abortOnDecline: true,
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

export { compiled };

registerIrCard("EX10-003", compiled);
