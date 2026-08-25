// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        {
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1, from: ["hand"] },
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "stackHasSameLevelCards", count: 2 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [{ tokens: ["Night Claw", "Light Fang", "Galaxy"], match: "trait" }],
          },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
          },
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["Night Claw", "Light Fang", "CS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT22-073", compiled);
export default compiled;
