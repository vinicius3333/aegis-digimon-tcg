// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4172: the 2 trashed digivolution cards must share a level with each other,
// not with this Digimon. Q4173 confirms the MetalGreymon name is an always-on rule.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "addName",
          tokens: ["MetalGreymon"],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
            count: 1,
          },
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byEffect",
          optional: true,
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }],
          },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
            raw: "by trashing 2 cards of the same level in this Digimon's digivolution cards",
          },
          raw: "you may trash 2 same-level digivolution cards to prevent it from leaving play",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["MetalGreymon"], cost: 0, isAlternate: true }],
};

registerIrCard("P-072", compiled);
