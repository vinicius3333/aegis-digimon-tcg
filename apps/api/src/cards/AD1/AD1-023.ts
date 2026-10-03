import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const placeHybridBody = (): Action[] => [
  {
    kind: "PlaceUnder",
    effectTextPart:
      "[Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid]\u00a0trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞",
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
    underFilter: { isSelfRef: true },
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
    effectTextPart: "Then, if there are 4 or more [Hybrid]\u00a0trait cards under this Tamer, gain 2 memory.",
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
