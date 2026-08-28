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
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
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
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Eosmon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Tamer"],
                  },
                  orFilters: [
                    {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [
                        {
                          tokens: ["Eosmon"],
                          match: "name",
                        },
                      ],
                    },
                  ],
                  count: 1,
                  to: "hand",
                },
              ],
              rest: "deckBottom",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "unsuspend",
          },
          while: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Eosmon"],
                  match: "name",
                },
              ],
            },
            raw: "you have an [Eosmon] in play",
          },
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

registerIrCard("BT6-092", compiled);
