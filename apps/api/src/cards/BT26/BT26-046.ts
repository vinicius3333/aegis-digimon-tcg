// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTarget = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 };
const ownDigimon = { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 };
const body = [
  { kind: "Suspend", target: opponentTarget },
  { kind: "Restrict", target: opponentTarget, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
  { kind: "Restrict", target: ownDigimon, restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" },
];
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
      ],
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Avian"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "any", isSelfRef: true },
          mode: "reduceCost",
          amount: 4,
          condition: {
            kind: "totalDigimonGte",
            filter: { kind: ["Digimon"], suspended: true },
            value: 2,
            raw: "there are 2 or more suspended Digimon",
          },
        },
      ],
    },
    { trigger: "OnPlay", actions: body },
    { trigger: "WhenDigivolving", actions: body },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }],
};
registerIrCard("BT26-046", compiled);
export default compiled;
