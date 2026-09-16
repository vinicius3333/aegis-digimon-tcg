import type { CompiledCard, CostGatedBlockAction } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Elizamon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              condition: {
                kind: "youHaveNone",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                },
                raw: "you don't have a Digimon",
              },
              optional: true,
            },
          ],
        } satisfies CostGatedBlockAction,
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
            nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
          },
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            optional: true,
            raw: "by suspending this Tamer",
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] When any of your Digimon digivolve into a [Reptile] or [Dragonkin] Digimon, by suspending this Tamer, that Digimon gets +3000 DP for the turn.",
              kind: "ModifyDP",
              target: {
                sourceRef: "triggerSubject",
                filter: {},
                count: 1,
              },
              amount: 3000,
              duration: "forTheTurn",
            },
            {
              effectTextPart: "Then, it may attack.",
              kind: "Attack",
              target: {
                sourceRef: "triggerSubject",
                filter: {},
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
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

registerIrCard("BT24-082", compiled);
