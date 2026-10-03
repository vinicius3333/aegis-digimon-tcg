import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon.",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "GainKeyword",
          effectTextPart:
            "Then, if they have no unsuspended Digimon, 1 of your Digimon gains ＜Blocker＞ (At blocker timing, by suspending this Digimon, it becomes the attack target) until the end of your opponent's turn.",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "opponentHasNone",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            raw: "your opponent has no unsuspended Digimon",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon.",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "GainKeyword",
          effectTextPart:
            "Then, if they have no unsuspended Digimon, 1 of your Digimon gains ＜Blocker＞ (At blocker timing, by suspending this Digimon, it becomes the attack target) until the end of your opponent's turn.",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "opponentHasNone",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            raw: "your opponent has no unsuspended Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 2000,
          },
          while: {
            kind: "selfTopHasText",
            filter: {
              nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
            },
            raw: "this Digimon has [Angoramon] in its text",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-011", compiled);
