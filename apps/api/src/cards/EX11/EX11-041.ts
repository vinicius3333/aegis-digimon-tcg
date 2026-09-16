import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 4, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true }],
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
          effectTextPart:
            "[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and ＜De-Digivolve 1＞ 1 of their Digimon.",
          kind: "SecurityManipulation",
          op: "flipUp",
          controller: "opponent",
          amount: 1,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and ＜De-Digivolve 1＞ 1 of their Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Invisimon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's their turn",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and ＜De-Digivolve 1＞ 1 of their Digimon.",
          kind: "SecurityManipulation",
          op: "flipUp",
          controller: "opponent",
          amount: 1,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and ＜De-Digivolve 1＞ 1 of their Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Invisimon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's their turn",
          },
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
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "attackTargetChange",
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-041", compiled);
