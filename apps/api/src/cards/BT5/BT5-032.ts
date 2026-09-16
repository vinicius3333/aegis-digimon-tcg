import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[When Attacking] Trash up to 2 digivolution cards from the bottom of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
          upTo: true,
        },
        {
          effectTextPart:
            "Then, if your opponent has a Digimon with no digivolution cards in play, this Digimon gains ＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon) for the turn.",
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
          duration: "forTheTurn",
          condition: {
            kind: "opponentHas",
            filter: {
              digivolutionCards: "none",
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon with no digivolution cards in play",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "attack",
          },
          while: {
            kind: "true",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "block",
          },
          while: {
            kind: "true",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-032", compiled);
