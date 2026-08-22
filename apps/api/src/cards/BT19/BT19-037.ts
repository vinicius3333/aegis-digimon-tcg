// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            colorCount: 1,
            playCostLte: 5,
          },
          payCost: false,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's your opponent's turn",
          },
        },
        {
          kind: "DisableTimingEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          timings: ["whenDigivolving"],
          duration: "forTheTurn",
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's your opponent's turn",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            colorCount: 1,
            playCostLte: 5,
          },
          payCost: false,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's your opponent's turn",
          },
        },
        {
          kind: "DisableTimingEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          timings: ["whenDigivolving"],
          duration: "forTheTurn",
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's your opponent's turn",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-037", compiled);
