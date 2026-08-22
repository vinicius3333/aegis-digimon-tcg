// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 5, condition: { kind: "raw", raw: "there is a Digimon with 13000 DP or more" } }] }],
    },
    ...(["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).map((trigger) => ({
      trigger,
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, amount: 3000, duration: "forTheTurn" },
        { kind: "Battle", attacker: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    })),
    {
      trigger: "AllTurns",
      actions: [{ kind: "SubTrigger", event: "whenBattleWon", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }, actions: [{ kind: "Trash", target: { filter: { zone: "security", controller: "opponent", position: "top" }, count: 1 } }] }],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT25-020", compiled);
