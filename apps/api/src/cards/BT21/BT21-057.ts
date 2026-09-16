import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "tokenEffect",
          tokens: ["GRANTEFFECT23TOKEN"],
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Tai Kamiya"],
                  match: "nameExact",
                },
                {
                  tokens: ["ADVENTURE"],
                  match: "trait",
                },
              ],
            },
            raw: "you have [Tai Kamiya] or a Tamer with the [ADVENTURE] trait",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "tokenEffect",
          tokens: ["GRANTEFFECT23TOKEN"],
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Tai Kamiya"],
                  match: "nameExact",
                },
                {
                  tokens: ["ADVENTURE"],
                  match: "trait",
                },
              ],
            },
            raw: "you have [Tai Kamiya] or a Tamer with the [ADVENTURE] trait",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Agumon"],
      cost: 2,
      isAlternate: true,
    },
    {
      traits: ["ADVENTURE"],
      cost: 2,
      isAlternate: true,
      level: 3,
    },
  ],
};

registerIrCard("BT21-057", compiled);
