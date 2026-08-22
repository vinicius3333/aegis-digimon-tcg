// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const ts = { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
export const compiled: CompiledCard = { effects: [
  { trigger: "StartOfYourMainPhase", actions: [{ kind: "Draw", controller: "mine", amount: 1, cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } } }, optional: true }, { kind: "GainMemory", amount: 1 }] },
  { trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } }, cost: { kind: "return", target: { count: 1, filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } }, to: "deckBottom" }, optional: true }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-092", compiled);
