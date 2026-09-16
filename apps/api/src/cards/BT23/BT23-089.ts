import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          affectsAll: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            count: "all",
          },
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
              },
              {
                kind: "trash",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "digivolutionCards",
                    sameHost: true,
                    sameLevelPair: true,
                    hostFilter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      zone: "battleArea",
                      nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                    },
                  },
                  count: 2,
                },
              },
            ],
            raw: "by suspending this Tamer and trashing 2 same-level digivolution cards from 1 of your [CS] trait Digimon",
          },
          actions: [],
          optional: true,
          raw: "When any of your Digimon with the [CS] trait would leave the battle area, by suspending this Tamer and trashing 2 same-level cards from 1 of your [CS] trait Digimon's digivolution cards, they don't leave",
        },
      ],
    },
    {
      trigger: "Security",
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
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-089", compiled);
