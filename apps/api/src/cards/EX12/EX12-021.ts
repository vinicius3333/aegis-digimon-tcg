import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-021 Gabumon
// [Digivolve] [Tsunomon]/Lv.2 w/[VB] trait: Cost 0
// [Start of Your Main Phase] By trashing 1 card with [Garurumon] in its name or the
//   [VB] trait from your hand, <Draw 1> and gain 1 memory.
// [Inherited][When Attacking][Once Per Turn] If your hand has 7 or fewer cards, <Draw 1>
//
// Cost is paid ONCE for the combined Draw+GainMemory effect; cost lives on the Draw action
// only (the first action in the sequence). GainMemory has no cost: `abortOnDecline` on the
// Draw already stops the whole sequence when the trash cost is declined or unpayable, and
// the printed text ties the memory gain to paying the cost, NOT to a card actually reaching
// the hand (an empty deck still gains the memory).
// The cost filter carries zone:"hand" explicitly; without it the hand branch of the trash
// cost is reached only through a regex over `cost.raw`.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [
                  {
                    tokens: ["Garurumon"],
                    match: "name",
                  },
                  {
                    tokens: ["VB"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with [Garurumon] in its name or the [VB] trait from your hand",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
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
      names: ["Tsunomon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["VB"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-021", compiled);
