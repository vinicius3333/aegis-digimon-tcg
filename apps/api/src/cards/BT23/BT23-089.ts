// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-089 (Takumi Aiba).
// [Start of Your Main Phase] If opponent has a Digimon, gain 1 memory.
// [All Turns] Replacement: when any of your [CS] Digimon would leave the battle area,
// you may pay: suspend this Tamer AND trash 2 same-level digivolution cards from 1 of
// your [CS] Digimon → they don't leave.
// [Security] Play this Tamer without paying the cost.
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
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
          },
          // Compound cost: suspend this Tamer AND trash 2 same-level digivolution cards
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
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                    zone: "digivolutionCards",
                    sameHost: true,
                    sameLevelPair: true,
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
