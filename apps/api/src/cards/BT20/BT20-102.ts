import type { Action, CompiledCard, Condition } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const omnimonInDigivolutionCards: Condition = {
  kind: "selfDigivolutionStackMatchesFilter",
  filter: {
    nameOrTrait: [
      { tokens: ["Omnimon"], match: "nameExact" },
      { tokens: ["X Antibody"], match: "nameExact" },
    ],
  },
  raw: "[Omnimon]/[X Antibody] is in this Digimon's digivolution cards",
};

/** The printed 「お互いのデジモン1体ずつ」: each player keeps 1 survivor, chosen by this effect's controller. */
const chooseSurvivor = (controller: "mine" | "opponent", bindAs: string): Action => ({
  kind: "SelectBind",
  target: { filter: { controller, kind: ["Digimon"] }, count: 1, bindAs },
  condition: omnimonInDigivolutionCards,
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        chooseSurvivor("mine", "survivorMine"),
        chooseSurvivor("opponent", "survivorOpponent"),
        {
          effectTextPart:
            "[On Play] [When Digivolving] If [Omnimon]/[X Antibody] is in this Digimon's digivolution cards, choose 1 of both players' Digimon and delete all other Digimon.",
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              excludeSelectionRef: ["survivorMine", "survivorOpponent"],
            },
            count: "all",
          },
          condition: omnimonInDigivolutionCards,
        },
        {
          effectTextPart: "Then, return 1 of your opponent's Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        chooseSurvivor("mine", "survivorMine"),
        chooseSurvivor("opponent", "survivorOpponent"),
        {
          effectTextPart:
            "[On Play] [When Digivolving] If [Omnimon]/[X Antibody] is in this Digimon's digivolution cards, choose 1 of both players' Digimon and delete all other Digimon.",
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              excludeSelectionRef: ["survivorMine", "survivorOpponent"],
            },
            count: "all",
          },
          condition: omnimonInDigivolutionCards,
        },
        {
          effectTextPart: "Then, return 1 of your opponent's Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: true,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Omnimon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-102", compiled);
