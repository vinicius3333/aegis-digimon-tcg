// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT7-062 (Dorugamon).
//
// Audit fixes:
//
// 1. Aura target was filtering for Digimon with [X-Antibody] — wrong. The target is
//    THIS Digimon (self). The Blocker is granted to this Digimon, not to X-Antibody Digimon.
//
// 2. The 'while' condition must be an OR of two subconditions:
//    (a) you have ANOTHER Digimon in play with [X-Antibody] in its traits
//    (b) a card with [X-Antibody] in its traits is in THIS Digimon's digivolution cards
//    The original only checked (a).

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
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
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["X-Antibody"],
                      match: "trait",
                    },
                  ],
                },
                raw: "you have another Digimon in play with [X-Antibody] in its traits",
              },
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["X-Antibody"],
                      match: "trait",
                    },
                  ],
                },
                raw: "a card with [X-Antibody] in its traits is in this Digimon's digivolution cards",
              },
            ],
            raw: "you have another Digimon in play with [X-Antibody] in its traits, or a card with [X-Antibody] in its traits is in this Digimon's digivolution cards",
          },
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
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["X-Antibody"], match: "trait" }],
            },
            raw: "this Digimon has [X-Antibody] in its traits",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-062", compiled);
