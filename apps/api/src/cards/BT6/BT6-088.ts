// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenMovedFromBreeding", sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gabumon", "Garurumon"], match: "name" }] }, actions: [{ kind: "GainMemory", amount: 1 }, { kind: "Draw", controller: "mine", amount: 1 }] }] },
    { trigger: "Main", frequency: "OncePerTurn", actions: [
      { kind: "Digivolve", target: { filter: { controller: "mine", kind: ["Digimon"], name: { tokens: ["Gabumon"], match: "nameExact" } }, count: 1 }, into: { controllerDefault: "mine", name: { tokens: ["Gabumon - Bond of Friendship"], match: "nameExact" } }, from: ["hand"], payCost: true, costOverride: 3, ignoreRequirements: true, bindResultAs: "bt6-088-bond" },
      { kind: "TrashSecurityTop", controller: "mine", count: 2, condition: { kind: "raw", raw: "you do" } },
      { kind: "DelayedDelete", target: { filter: { boundRef: "bt6-088-bond" }, count: 1 }, timing: "endOfOwnerTurn", condition: { kind: "securityAtLeast", value: 1 } },
    ] },
    { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-088", compiled);
