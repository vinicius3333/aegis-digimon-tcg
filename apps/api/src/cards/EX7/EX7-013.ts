import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may use 1 Option card with the [Three Musketeers] trait from your hand without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
            controller: "mine",
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
        {
          effectTextPart: "Then, draw cards until there are 6 cards in your hand.",
          kind: "Draw",
          amount: 1,
          untilHandSize: 6,
          controller: "mine",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may use 1 Option card with the [Three Musketeers] trait from your hand without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
            controller: "mine",
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
        {
          effectTextPart: "Then, draw cards until there are 6 cards in your hand.",
          kind: "Draw",
          amount: 1,
          untilHandSize: 6,
          controller: "mine",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "magnaAttackTarget",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                kind: ["Option"],
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            raw: "By trashing 1 Option card in this Digimon's digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "magnaAttackTarget", filter: {}, count: 1 },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: { fromSelectionRef: "magnaAttackTarget", filter: {}, count: 1 },
          withoutSuspending: false,
          optional: false,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Three Musketeers"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-013", compiled);
