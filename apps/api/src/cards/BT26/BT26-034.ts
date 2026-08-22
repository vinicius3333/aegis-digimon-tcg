// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = { effects: [
  { trigger: "StartOfYourMainPhase", actions: [{ kind: "Digivolve", target: { count: 1, filter: { isSelf: true } }, from: ["hand"], into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Vegetation"], match: "trait" }, { tokens: ["TS"], match: "trait" }] }, payCost: false, optional: true, condition: { kind: "memoryAtMost", value: 4, controller: "mine" } }] },
  { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } }, optional: true }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-034", compiled);
