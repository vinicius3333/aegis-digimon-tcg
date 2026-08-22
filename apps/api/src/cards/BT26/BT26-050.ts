// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const anyDigimonTamer = { filter: { controller: "any", kind: ["Digimon", "Tamer"] }, count: 2, upTo: true };
const opponentDigimonTamer = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2, upTo: true };
const suspendLock = [
  { kind: "Suspend", target: anyDigimonTamer, optional: true },
  { kind: "Restrict", target: opponentDigimonTamer, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
];
const securityCost = { kind: "Return", target: { filter: { controller: "any", kind: ["Digimon"], suspended: true, excludeSelf: true }, count: 1 }, to: "deckBottom", optional: true };
const trashSecurity = { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, condition: { kind: "ifThisEffectActed" } };
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { controller: "mine", nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] } } }] },
  { trigger: "WhenDigivolving", actions: [...suspendLock, securityCost, trashSecurity] },
  { trigger: "WhenAttacking", actions: [securityCost, trashSecurity] },
  { trigger: "Main", actions: [
    { kind: "Suspend", target: opponentDigimonTamer },
    { kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], suspended: true }, count: "all" }, restriction: "digivolve", duration: "untilOpponentTurnEnd" },
    { kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], suspended: true }, count: "all" }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
  ] },
], coverage: "full", residual: [] };
registerIrCard("BT26-050", compiled);
export default compiled;
