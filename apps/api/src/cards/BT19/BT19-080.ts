// @ts-nocheck
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = {
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
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon"], match: "name" }],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: { controllerDefault: "mine", kind: ["Digimon"] },
                count: 1,
                sourceRef: "triggerSubject",
              },
              keyword: { keyword: "Raid", raw: "＜Raid＞" },
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Attack",
              target: {
                filter: { controllerDefault: "mine", kind: ["Digimon"] },
                count: 1,
                sourceRef: "triggerSubject",
              },
              withoutSuspending: false,
              attackPlayer: true,
              mandatory: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-080", compiled);
