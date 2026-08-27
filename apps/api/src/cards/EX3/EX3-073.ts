// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: self,
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "untilEachTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      condition: {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }] },
      },
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "digivolutionCards",
              nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
            },
            count: 1,
          },
          to: "deckBottom",
          from: ["digivolutionCards"],
          bindResultAs: "returnedDragonMode",
        },
        {
          kind: "DisableSecurityEffect",
          target: self,
          sourceKind: "any",
          duration: "forTheTurn",
          scope: "seat",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "selfHasMinTrash", count: 1, filter: { nameOrTrait: [{ tokens: ["Wormmon"], match: "nameExact" }] } },
          { kind: "selfHasMinTrash", count: 1, filter: { nameOrTrait: [{ tokens: ["Veemon"], match: "nameExact" }] } },
        ],
      },
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Wormmon"], match: "nameExact" }] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Veemon"], match: "nameExact" }] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-073", compiled);
