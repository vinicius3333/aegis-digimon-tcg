// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-045 MetalGreymon
// Text: "[When Digivolving] 1 of your other Digimon may digivolve into a level 6 or lower
//   Digimon card with [Garurumon] in its name in your hand for the digivolution cost.
//   When that Digimon would digivolve by this effect, reduce the digivolution cost by 2."
// Inherited: When an opponent's Digimon attacks, you may suspend this Digimon to force the
//   opponent to attack it instead.
// No KB entries.
// Fixes:
//   - Digivolve action: target is another Digimon (excludeSelf), hand-only source (already there)
//   - Cost reduction Replacement: scope to "the Digimon chosen by this effect" (bindAs +
//     fromSelectionRef), not any digivolve action by any of my Digimon
//   - Remove stray nested Replacement (was doubly-nested, now flat inside Digivolve)
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "ex4045DigivolveTarget",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Garurumon"],
                match: "name",
              },
            ],
          },
          from: ["hand"],
          costDelta: -2,
          optional: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                optional: true,
                raw: "suspend this Digimon",
              },
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-045", compiled);
