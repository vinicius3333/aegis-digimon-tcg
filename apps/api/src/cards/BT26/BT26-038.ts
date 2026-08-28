// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const clause = [
  { kind: "Suspend", target: { count: 1, filter: { controller: "any", kind: ["Digimon"] } }, optional: true },
  {
    kind: "ModifyDP",
    target: {
      count: 1,
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Insectoid"], match: "trait" },
          { tokens: ["Titan"], match: "trait" },
        ],
      },
    },
    amount: 3000,
    duration: "untilOpponentTurnEnd",
  },
];
const inheritedDigivolve = {
  kind: "SubTrigger",
  event: "whenBattleWon",
  sourceFilter: { isSelfRef: true },
  actions: [
    {
      kind: "Digivolve",
      target: {
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [
            { tokens: ["Insectoid"], match: "trait" },
            { tokens: ["Titan"], match: "trait" },
          ],
        },
        count: 1,
      },
      into: {
        controllerDefault: "mine",
        zone: "hand",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Insectoid"], match: "trait" },
          { tokens: ["Titan"], match: "trait" },
        ],
      },
      from: ["hand"],
      payCost: true,
      costDelta: -1,
      optional: true,
    },
  ],
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: clause },
    { trigger: "WhenDigivolving", actions: clause },
    { trigger: "WhenMoving", actions: clause },
    { trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [inheritedDigivolve] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }],
};
registerIrCard("BT26-038", compiled);
