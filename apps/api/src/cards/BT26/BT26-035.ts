// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const anyDigimon = { controller: "any", kind: ["Digimon"] };
const insectoidOrNsp = [
  { tokens: ["Insectoid"], match: "trait" },
  { tokens: ["NSp"], match: "trait" },
];
const suspend = { kind: "Suspend", target: { filter: anyDigimon, count: 1 }, optional: true };
const inheritedDigivolve = {
  kind: "SubTrigger",
  event: "whenBattleWon",
  sourceFilter: { isSelfRef: true },
  actions: [
    {
      kind: "Digivolve",
      target: { filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: insectoidOrNsp }, count: 1 },
      into: { controllerDefault: "mine", zone: "hand", kind: ["Digimon"], nameOrTrait: insectoidOrNsp },
      from: ["hand"],
      payCost: true,
      costDelta: -1,
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [suspend] },
    { trigger: "WhenMoving", actions: [suspend] },
    { trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [inheritedDigivolve] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }],
};

registerIrCard("BT26-035", compiled);
