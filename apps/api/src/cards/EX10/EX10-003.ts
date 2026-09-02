import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
                // "3 [Mineral] or [Rock] trait CARDS", not Digimon cards: a `kind: ["Digimon"]`
                // gate would exclude the Digi-Egg at the bottom of the stack, and Tumblemon
                // itself carries the [Rock] trait (catalog kind DigiEgg). KB Q5007 requires the
                // full 3 to be payable or the "by" condition is unmet.
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
