// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX3-025 (errata 2022-11-11 and Q3402).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "triggerPlayedByEffectSource",
            sourceCardId: "EX3-069",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [
                {
                  tokens: ["Trial of the Four Great Dragons"],
                  match: "name",
                },
              ],
            },
            count: 1,
            zone: "hand",
            from: "hand",
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              kind: ["Option"],
              nameOrTrait: [
                {
                  tokens: ["Trial of the Four Great Dragons"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have a [Trial of the Four Great Dragons] in play",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-025", compiled);
