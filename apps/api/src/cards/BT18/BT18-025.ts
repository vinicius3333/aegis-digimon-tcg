// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { digivolutionCards: "none", controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { digivolutionCards: "none", controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Ice-Snow"],
        },
      ],
    },
    { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Tommy Himi"], cost: 3, isAlternate: true },
    { names: ["Kumamon"], cost: 1, isAlternate: true },
  ],
};

registerIrCard("BT18-025", compiled);
