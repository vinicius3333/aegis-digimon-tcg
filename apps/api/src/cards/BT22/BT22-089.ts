import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              playCost: { op: "gte", value: 4 },
              nameOrTrait: [
                { tokens: ["Mirei Mikagura"], match: "nameExact" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [
                  { tokens: ["Holy Beast"], match: "trait" },
                  { tokens: ["Angel"], match: "trait" },
                  { tokens: ["Archangel"], match: "trait" },
                  { tokens: ["Fallen Angel"], match: "trait" },
                  { tokens: ["CS"], match: "trait" },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Holy Beast], [Angel], [Archangel], [Fallen Angel] or [CS] trait from your hand",
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

registerIrCard("BT22-089", compiled);
