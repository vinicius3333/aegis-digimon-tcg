// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const modal = { kind: "Modal", choose: 1, options: [[{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }], [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 2 } }]] };
export const compiled: CompiledCard = { effects: [{ trigger: "Main", actions: [modal] }, { trigger: "Security", actions: [modal] }], coverage: "full", residual: [] };
registerIrCard("BT1-111", compiled);
export default compiled;
