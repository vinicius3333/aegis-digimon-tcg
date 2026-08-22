// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const csTarget = { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }, count: 1 };
const protect = { kind: "Restrict", target: csTarget, restriction: "beAffected", duration: "untilOpponentTurnEnd", fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true };
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }], actions: [] },
  { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-058-protect-cs", actions: [protect] },
  { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bt26-058-protect-cs", actions: [protect] },
  { trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldLeavePlay", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Prevent", optional: true, abortOnDecline: true, cost: { kind: "placeOwnTopAtStackBottom", target: { filter: { isSelfRef: true }, count: 1 } } }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-058", compiled);
export default compiled;
