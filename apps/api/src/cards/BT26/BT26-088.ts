// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = { effects: [
  { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }] },
  { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { count: 1, filter: { isSelfRef: true } }, payCost: false }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-088", compiled);
