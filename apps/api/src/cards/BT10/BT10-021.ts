// HAND-FIXED IR for BT10-021 — do not regenerate.
// WhenAttacking: added block Restrict; condition changed to raw covering Blue Flare + opponent 2+.
// Explicit battle-area zones preserve the printed "in play" scope for all three conditions.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["MetalGreymon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              nameOrTrait: [
                {
                  tokens: ["Kiriha Aonuma"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you have a [Kiriha Aonuma] in play",
          },
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Kiriha Aonuma"],
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
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Kiriha Aonuma"], match: "nameExact" }],
            },
            raw: "you don't have a [Kiriha Aonuma] in play",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
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
            kind: ["Tamer"],
          },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Save",
          raw: "＜Save＞",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] } },
              { kind: "opponentHas", filter: { zone: "battleArea", kind: ["Digimon"] }, countMin: 2 },
            ],
            raw: "this Digimon has [Blue Flare] in its traits and your opponent has 2 or more Digimon in play",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            sameTarget: true,
          },
          restriction: "block",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] } },
              { kind: "opponentHas", filter: { zone: "battleArea", kind: ["Digimon"] }, countMin: 2 },
            ],
            raw: "this Digimon has [Blue Flare] in its traits and your opponent has 2 or more Digimon in play",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-021", compiled);
