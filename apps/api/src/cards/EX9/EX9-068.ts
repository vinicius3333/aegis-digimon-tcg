// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }] },
    { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"], playCostGte: 7, nameOrTrait: [{ tokens: ["Cyborg", "Machine", "DM"], match: "trait" }] }, actions: [
      { kind: "Draw", controller: "mine", amount: 1, cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } } },
      { kind: "GainMemory", amount: 1 },
      { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand" }, count: 1, from: ["hand"] }, underFilter: { isTriggerSource: true }, position: "bottom", faceDown: true, optional: true },
    ], raw: "When any of your play cost 7 or higher [Cyborg], [Machine] or [DM] trait Digimon are played" }] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }] },
  ], coverage: "full", residual: [],
};
registerIrCard("EX9-068", compiled);
