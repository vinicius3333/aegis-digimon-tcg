// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          optionConditions: [
            {
              kind: "allOf",
              conditions: [
                { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", nameOrTrait: [{ tokens: ["Kiriha Aonuma"], match: "name" }] } },
                { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 1 },
              ],
            },
          ],
          options: [
            [
              {
                kind: "Return",
                target: { filter: { zone: "trash", controllerDefault: "mine", nameOrTrait: [{ tokens: ["MetalGreymon"], match: "name" }] }, count: 1 },
                to: "hand",
              },
            ],
            [
              {
                kind: "RevealAdd",
                revealCount: 4,
                add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] }, count: 2, to: "hand" }],
                rest: "deckBottom",
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controllerDefault: "mine", kind: ["Tamer"] },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] } },
              { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 2 },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-019", compiled);
