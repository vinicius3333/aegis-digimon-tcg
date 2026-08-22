// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", condition: { kind: "isDnaDigivolving", raw: "If DNA digivolving" }, actions: [{ kind: "Restrict", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, restriction: "beAffected", fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true, duration: "forTheTurn" }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" }, count: "all" } }] },
    { trigger: "EndOfAttack", optional: true, frequency: "OncePerTurn", actions: [
      { kind: "PlayWithoutCost", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Greymon"], match: "name" }, { tokens: ["Ver.1"], match: "trait" }] }, count: 1 }, from: ["digivolutionCards"], fromOwnDigivolutionStack: true, payCost: false },
      { kind: "PlayWithoutCost", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }, { tokens: ["Ver.2"], match: "trait" }] }, count: 1 }, from: ["digivolutionCards"], fromOwnDigivolutionStack: true, payCost: false },
      { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "ifThisEffectActed" } },
    ] },
  ], coverage: "full", residual: [],
};
registerIrCard("EX9-021", compiled);
