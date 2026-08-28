// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RB1-032 Hiro Amanokawa
// [Start of Your Main Phase] By placing 1 Digimon card with [Gammamon] in its name
//   from your hand as 1 of your Digimon's bottom digivolution card, gain 1 memory and <Draw 1>.
// [Your Turn] When one of your Digimon digivolves into a Digimon with [Gammamon] in its text,
//   by suspending this Tamer, that Digimon gets +2000 DP for the turn.
// [Security] Play this Tamer without paying its cost.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Gammamon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Digimon card with [Gammamon] in its name from your hand as 1 of your Digimon's bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          optional: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if you placed a [Gammamon] card for this effect",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          triggerFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Gammamon"],
                match: "text",
              },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  triggerSubject: true,
                },
                count: 1,
              },
              amount: 2000,
              duration: "forTheTurn",
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer, that Digimon gets +2000 DP for the turn",
          },
          raw: "When one of your Digimon digivolves into a Digimon with [Gammamon] in its text, by suspending this Tamer, that Digimon gets +2000 DP for the turn",
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

registerIrCard("RB1-032", compiled);
