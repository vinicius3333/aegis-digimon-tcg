import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true }],
  effects: [
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipUp",
          controller: "opponent",
          amount: 1,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and return 1 of their lowest play cost Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
          to: "deckBottom",
        },
        {
          effectTextPart: "Then, this Digimon gains ＜Security A. +1＞ until your turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "untilYourTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipUp",
          controller: "opponent",
          amount: 1,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and return 1 of their lowest play cost Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
          to: "deckBottom",
        },
        {
          effectTextPart: "Then, this Digimon gains ＜Security A. +1＞ until your turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "untilYourTurnEnd",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          sourceFilter: { controllerDefault: "mine" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              detachPermanentTop: true,
              faceUp: true,
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-043", compiled);
