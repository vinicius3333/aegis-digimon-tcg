// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
const anyDigimon = { filter: { controller: "any", kind: ["Digimon"] }, count: 1 };
const suspendedTraits = { filter: { controller: "mine", kind: ["Digimon"], suspended: true, nameOrTrait: [
  { tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" },
] }, count: "all" };
const suspendBuff = [
  { kind: "Suspend", target: anyDigimon, optional: true },
  { kind: "Restrict", target: suspendedTraits, restriction: "beAffected", duration: "untilOpponentTurnEnd", fromSourceKind: ["Option"], byOpponentEffectsOnly: true },
  { kind: "ModifyDP", target: suspendedTraits, amount: 3000, duration: "untilOpponentTurnEnd" },
];
const battle = { kind: "Battle", attacker: { filter: { isSelfRef: true }, count: 1, isSelf: true }, defender: opponentDigimon, optional: true };
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: [battle, ...suspendBuff] },
  { trigger: "WhenDigivolving", actions: [battle, ...suspendBuff] },
  { trigger: "StartOfYourMainPhase", actions: suspendBuff },
], coverage: "full", residual: [] };
registerIrCard("BT26-047", compiled);
export default compiled;
