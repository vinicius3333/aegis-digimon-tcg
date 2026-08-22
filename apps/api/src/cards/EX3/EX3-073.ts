// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "digivolutionCards",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          to: "deckBottom",
          bindResultAs: "returnedDragonMode",
        },
        {
          kind: "DisableSecurityEffect",
          target: self,
          sourceKind: "any",
          duration: "forTheTurn",
          condition: { kind: "bindingExists", ref: "returnedDragonMode" },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      optional: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Wormmon"], match: "nameExact" }] }, count: 1 }, from: ["trash"], payCost: false, optional: true },
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Veemon"], match: "nameExact" }] }, count: 1 }, from: ["trash"], payCost: false, optional: true },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-073", compiled);
