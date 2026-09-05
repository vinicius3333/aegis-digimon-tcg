// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: "Trash any 2 digivolution cards of your opponent's Digimon" means
// 2 total divo cards spread across any opponent Digimon (not 2 from a single target).
// The interpreter's acrossDigimon scope pools the opponent's stacks and lets
// the controller choose exactly two cards across any number of Digimon.
// fromTop is omitted (false by default) per card text — not top-specific.
// Inherited [Your Turn]: target filter includes [Ice-Snow] trait per text
// "this Digimon with the [Ice-Snow] trait gains".
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "IceClad",
          raw: "＜Ice Clad＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          scope: "acrossDigimon",
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Ice-Snow"],
        },
      ],
    },
    {
      trigger: "YourTurn",
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
              keyword: "Piercing",
              raw: "＜Piercing＞",
            },
          },
          while: {
            kind: "allOf",
            conditions: [
              {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] },
              },
              {
                kind: "opponentHasNone",
                filter: { digivolutionCards: "hasAny", controllerDefault: "opponent", kind: ["Digimon"] },
              },
            ],
            raw: "this Digimon has Ice-Snow and your opponent has no Digimon with digivolution cards",
          },
        },
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
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "allOf",
            conditions: [
              {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] },
              },
              {
                kind: "opponentHasNone",
                filter: { digivolutionCards: "hasAny", controllerDefault: "opponent", kind: ["Digimon"] },
              },
            ],
            raw: "this Digimon has Ice-Snow and your opponent has no Digimon with digivolution cards",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-021", compiled);
