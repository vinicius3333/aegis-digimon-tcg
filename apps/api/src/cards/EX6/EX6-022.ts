// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -2,
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mirei Mikagura"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you have a [Mirei Mikagura]",
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mirei Mikagura"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mirei Mikagura"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you don't have a [Mirei Mikagura]",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -2,
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mirei Mikagura"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you have a [Mirei Mikagura]",
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mirei Mikagura"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mirei Mikagura"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you don't have a [Mirei Mikagura]",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Alliance",
              raw: "＜Alliance＞",
            },
          },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Angel", "Three Great Angels"], match: "trait" }] },
            raw: "this Digimon has the [Angel]/[Three Great Angels] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-022", compiled);
