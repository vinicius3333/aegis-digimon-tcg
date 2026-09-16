import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart: "Then, this Digimon gains ＜Raid＞ and ＜Retaliation＞ until your opponent's turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart: "Then, this Digimon gains ＜Raid＞ and ＜Retaliation＞ until your opponent's turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart: "Then, this Digimon gains ＜Raid＞ and ＜Retaliation＞ until your opponent's turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart: "Then, this Digimon gains ＜Raid＞ and ＜Retaliation＞ until your opponent's turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Megidramon", "ChaosGallantmon"],
                match: "name",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
          reduceCostScaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "any",
            },
            unit: "cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Growlmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-076", compiled);
