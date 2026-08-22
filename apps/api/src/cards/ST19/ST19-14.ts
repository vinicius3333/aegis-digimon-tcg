// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: { kind: "memoryAtMost", value: 2, raw: "you have 2 or less memory" },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            orFilters: [{ isToken: true }, { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] }],
          },
          effectSourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: {}, count: 1, sourceRef: "triggerSubject" },
              keyword: { keyword: "Rush", raw: "＜Rush＞" },
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1 },
                raw: "by suspending this Tamer",
              },
              optional: true,
            },
          ],
          raw: "When an effect plays one of your Tokens or a [Puppet] trait Digimon, by suspending this Tamer, that Digimon gains ＜Rush＞ for the turn.",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST19-14", compiled);
