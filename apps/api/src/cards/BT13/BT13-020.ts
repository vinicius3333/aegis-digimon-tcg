// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [
      { kind: "Digivolve", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, into: { name: "ShineGreymon" }, payCost: false, reduceCost: 0 },
      { kind: "Return", target: { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] }, count: 1 }, to: "hand" },
      { kind: "TrashDigivolution", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 1, position: "top" },
    ] },
    { trigger: "WhenDigivolving", optional: true, actions: [
      { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] }, count: 1 }, from: ["hand"], payCost: false, optional: true, bindResultAs: "playedMarcus" },
      { kind: "GrantStatic", target: { filter: { boundRef: "playedMarcus" }, count: 1 }, grant: "kind", tokens: ["Digimon"], staticEffect: { kind: "SetBaseDP", value: 12000 }, duration: "forTheTurn" },
      { kind: "Restrict", target: { filter: { boundRef: "playedMarcus" }, count: 1 }, restriction: "digivolve", duration: "forTheTurn" },
      { kind: "GainKeyword", target: { filter: { boundRef: "playedMarcus" }, count: 1 }, keyword: { keyword: "Rush", raw: "＜Rush＞" }, duration: "forTheTurn" },
    ] },
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"] }, actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }] }] },
  ],
  coverage: "full", residual: [], digivolutionRequirement: [{ names: ["ShineGreymon", "Marcus Damon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT13-020", compiled);
export { compiled };
