// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = { effects: [
  { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }] },
  { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Boss", "TS"], match: "trait" }] }, actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amountChoices: [
    { amount: 2, condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] }, raw: "you have no Digimon" } },
    { amount: 1, condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"] }, raw: "you have a Digimon" } },
  ], cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1 } }, raw: "by suspending this Tamer, reduce the play cost by 1, or by 2 if you have no Digimon" }] }] },
  { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { count: 1, filter: { isSelfRef: true } }, payCost: false }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-088", compiled);
