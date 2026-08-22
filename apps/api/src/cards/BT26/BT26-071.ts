// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const deleteAction = { kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } }, cost: { kind: "deleteOwn", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } }, raw: "By deleting 1 of your Digimon" } };
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
  { trigger: "OnPlay", actions: [deleteAction] },
  { trigger: "WhenDigivolving", actions: [deleteAction] },
], coverage: "full", residual: [] };
registerIrCard("BT26-071", compiled);
