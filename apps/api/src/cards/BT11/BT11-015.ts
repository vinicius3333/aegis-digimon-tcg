// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Shoutmon"],
          digiXrosOnly: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          condition: {
            kind: "not",
            condition: {
              kind: "selfDigivolutionStackHasTrait",
              filter: { nameOrTrait: [{ tokens: ["Shoutmon"], match: "name" }] },
            },
          },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 2 },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Shoutmon"], match: "name" }] },
            raw: "[Shoutmon] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"] },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" } },
          while: { kind: "selfHasNameContaining", names: ["Shoutmon"], raw: "this Digimon has [Shoutmon] in its name" },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Shoutmon"], cost: 4, isAlternate: true }],
};

registerIrCard("BT11-015", compiled);
