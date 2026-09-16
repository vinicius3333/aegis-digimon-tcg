import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] ＜Draw 2＞. (Draw 2 cards from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart: "Then, if this card was played by [Trial of the Four Great Dragons]'s effect, gain 2 memory.",
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
