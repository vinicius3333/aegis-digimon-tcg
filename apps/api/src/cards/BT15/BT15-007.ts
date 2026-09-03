import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Red"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
          cost: {
            kind: "trash",
            target: {
              filter: {
                excludeNameOrTrait: [
                  {
                    tokens: ["Sea Animal"],
                    match: "trait",
                  },
                ],
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 Digimon card with [Avian]/[Bird]/[Beast]/[Animal]/[;Sovereign] in one of its traits other than [Sea Animal] in your hand",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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

registerIrCard("BT15-007", compiled);
export { compiled };
