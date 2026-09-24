import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Shoto Kazama"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          abortOnDecline: true,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, if you don't have a Digimon, you may play 1 level 3 Digimon card with [Avian]/[Bird] in any of its traits from your trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              nameOrTrait: [
                {
                  tokens: ["Avian", "Bird"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "allOf",
            conditions: [{ kind: "ifThisEffectActed" }, { kind: "youHaveNone", filter: { kind: ["Digimon"] } }],
            raw: "you don't have a Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By suspending this Tamer",
          },
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Vortex Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
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

registerIrCard("BT20-085", compiled);
