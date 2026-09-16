import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Suspend",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                optional: false,
              },
              {
                kind: "Attack",
                attacker: {
                  filter: {
                    boundRef: "parasitemonHost",
                  },
                  count: 1,
                },
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                mandatory: true,
                raw: "Attack an opponent's Digimon with the Digimon this card was placed under.",
              },
            ],
            [],
          ],
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "payMemory",
                memory: 4,
                raw: "By paying 4 cost",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  from: ["hand"],
                },
                underFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "gte",
                    value: 5,
                  },
                },
                destination: "digivolutionStack",
                host: "target",
                position: "bottom",
                bindHostAs: "parasitemonHost",
                raw: "placing this card as the bottom digivolution card of 1 of your level 5 or higher Digimon",
              },
            ],
            raw: "By paying 4 cost and placing this card as the bottom digivolution card of 1 of your level 5 or higher Digimon",
          },
          optional: true,
          payCostBeforeOptional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          targetIsPermanent: true,
          shedOwnCards: true,
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byOpponentEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Parasitemon"],
                      match: "nameExact",
                    },
                  ],
                  zone: "digivolutionCards",
                  hostFilter: {
                    isSelfRef: true,
                  },
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-050", compiled);
