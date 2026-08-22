// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "Restrict", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } }, restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" },
  ] },
  { trigger: "None", isInherited: true, actions: [{ kind: "GainKeyword", keyword: "Evade", duration: "permanent" }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-020", compiled);
