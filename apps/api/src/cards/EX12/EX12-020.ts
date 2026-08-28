// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-020 Gasamon
// [Digivolve] Lv.2 w/[Shambala] trait: Cost 0
// [Your Turn] When this Digimon would digivolve into a Digimon card with the [TB] trait,
//   reduce the cost by 1.
// [Inherited][When Attacking][Once Per Turn] If your hand has 7 or fewer cards, <Draw 1>
//
// Cost-reduction encoded as wouldDigivolve outer Replacement (gates on digivolving source)
// with `into: { traits: ["TB"] }` to restrict to TB-trait digivolution targets, and an
// inner wouldDigivolve reduceCost action (mirrors EX12-040 / BT5-058 pattern).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            traits: ["TB"],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the cost by 1",
            },
          ],
          raw: "When this Digimon would digivolve into a Digimon card with the [TB] trait, reduce the cost by 1",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "handAtMost",
            value: 7,
            raw: "your hand has 7 or fewer cards",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Shambala"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-020", compiled);
