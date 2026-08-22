// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = { effects: [{ trigger: "WhenDigivolving", actions: [{ kind: "Recover", controller: "mine", amount: 1 }] }, { trigger: "YourTurn", isInherited: true, actions: [{ kind: "GainKeyword", target: { isSelf: true }, keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn", condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 3 } }] }], coverage: "full", residual: [] };
registerIrCard("BT1-063", compiled);
export default compiled;
