// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// AD1-023 J.P., Koji, & Koichi.
// Q6113: "different colors" is an assignment of one distinct color to each selected card;
// the IR targeting filter enforces that rule, including for multicolor cards.
// Q6114: the four-Hybrid threshold is checked independently of whether this activation placed
// a card, so the Draw clause alone is gated by ifThisEffectActed.
const placeHybridBody = () => [
  {
    kind: "PlaceUnder",
    target: {
      filter: {
        differentColors: true,
        controller: "mine",
        nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
      },
      count: 2,
      upTo: true,
      from: ["hand", "trash"],
    },
    underFilter: { controllerDefault: "mine", kind: ["Tamer"] },
    trackCount: "placedHybrid",
    optional: true,
  },
  {
    kind: "Draw",
    controller: "mine",
    amount: 1,
    condition: { kind: "namedCountAtLeast", countSource: "placedHybrid", count: 1, raw: "this effect placed" },
  },
  {
    kind: "GainMemory",
    amount: 2,
    condition: {
      kind: "selfDigivolutionStackCountAtLeast",
      count: 4,
      filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
      raw: "if there are 4 or more [Hybrid] trait cards under this Tamer",
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
    { trigger: "StartOfYourMainPhase", actions: placeHybridBody() },
    { trigger: "OnPlay", actions: placeHybridBody() },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }],
          },
          cost: {
            kind: "securityToHand",
            controller: "mine",
            count: 1,
            raw: "by adding your top security card to the hand",
          },
          raw: "by adding your top security card to the hand, it doesn't leave",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("AD1-023", compiled);
