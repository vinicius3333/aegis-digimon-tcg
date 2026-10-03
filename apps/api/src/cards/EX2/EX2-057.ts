import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["MarineAngemon"],
                match: "nameExact",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce its play cost by 1",
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          effectTextPart:
            "[Your Turn] When you play a blue Digimon, you may suspend this Tamer to trash the bottom digivolution card of 1 of your opponent's Digimon.",
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Blue"],
            nameOrTrait: [{ tokens: ["MarineAngemon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: 1,
              },
              amount: 1,
              fromTop: false,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: false,
            },
            {
              effectTextPart:
                "Then, if the Digimon played is [MarineAngemon], trash the bottom digivolution card of all of your opponent's Digimon.",
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: "all",
              },
              amount: 1,
              fromTop: false,
              condition: { kind: "ifThisEffectActed" },
            },
          ],
        },
        {
          effectTextPart:
            "[Your Turn] When you play a blue Digimon, you may suspend this Tamer to trash the bottom digivolution card of 1 of your opponent's Digimon.",
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Blue"],
            nameOrTrait: [{ tokens: ["MarineAngemon"], match: "nameExact", negate: true }],
          },
          actions: [
            {
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: 1,
              },
              amount: 1,
              fromTop: false,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
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

registerIrCard("EX2-057", compiled);
