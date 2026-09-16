import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Trash the bottom 2 digivolution card of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          effectTextPart:
            "Then, if your opponent has no Digimon with digivolution cards, this Digimon gains ＜Jamming＞and ＜Blocker＞until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Jamming",
            raw: "＜Jamming＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
        {
          effectTextPart:
            "Then, if your opponent has no Digimon with digivolution cards, this Digimon gains ＜Jamming＞and ＜Blocker＞until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Ice-Snow"],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          fromTop: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-020", compiled);
