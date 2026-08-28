// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mother = {
  controller: "mine" as const,
  kind: ["Digimon"] as const,
  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" as const }],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: { nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 3,
              nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by returning this Tamer to the bottom of the deck",
          },
          playCostCeiling: {
            base: 3,
            raise: 1,
            per: 1,
            filter: mother,
            unit: "digivolutionCardsOfFiltered",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-158", compiled);
