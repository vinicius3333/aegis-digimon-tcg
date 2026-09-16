import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Tamer"],
            },
            count: 3,
            raw: "your opponent has 3 or more Tamers",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: {
                  kind: ["Digimon"],
                  levelComparison: { op: "gte", value: 4 },
                },
                raw: "that Digimon is level 4 or higher",
              },
            },
            {
              kind: "Draw",
              amount: 1,
              controller: "mine",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: {
                  kind: ["Digimon"],
                  levelComparison: { op: "eq", value: 3 },
                },
                raw: "that Digimon is level 3",
              },
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-035", compiled);
