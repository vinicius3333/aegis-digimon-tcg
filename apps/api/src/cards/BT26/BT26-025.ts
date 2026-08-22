// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const placeAndRecover = [{ kind: "PlaceUnder", target: { count: 1, filter: { zone: "security", controller: "mine" } }, from: ["security"], destination: { count: 1, filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] } }, faceDown: true }, { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 }];
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: placeAndRecover }, { trigger: "OnMove", actions: placeAndRecover },
  { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, optional: true }, { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1, condition: { kind: "securityAtMost", controller: "mine", value: 0 } }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-025", compiled);
