// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const grantTarget = { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [
  { tokens: ["Social"], match: "trait" }, { tokens: ["Tool"], match: "trait" }, { tokens: ["Open"], match: "trait" }, { tokens: ["Seven Code"], match: "trait" },
] }, count: 1 };
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }], actions: [] },
  { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [
    { kind: "GainKeyword", keyword: { keyword: "Collision" }, target: grantTarget, duration: "untilEachTurnEnd" },
    { kind: "ModifyDP", target: grantTarget, amount: 3000, duration: "untilEachTurnEnd" },
  ] }] },
  { trigger: "Static", isLinked: true, actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 2 }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-051", compiled);
export default compiled;
