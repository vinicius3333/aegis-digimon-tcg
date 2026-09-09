import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
          // Q2803: "By paying 4 cost and placing this card as the bottom digivolution card of 1 of
          // your level 5 or higher Digimon" is ONE activation cost. With the placement modeled as
          // the first action of option[0] the modal activated with no legal host, charged the 4
          // memory and placed nothing; as a compound cost `canPayCost` refuses the activation up
          // front. Q2804: with the placement out of the bullet, option[1] = [] is the real
          // "placed, nothing else" branch the ruling allows.
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
                // `underFilter` is only read as the destination when the host is the cost's own
                // chosen target; without this the placement falls back to the source permanent,
                // which does not exist while this card is still in hand.
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
                      match: "name",
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
