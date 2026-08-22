// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const iliad = { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };
const eligibleSecurityCard = { controllerDefault: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [
  { tokens: ["Angel"], match: "trait" }, { tokens: ["TS"], match: "trait" },
] };
const handTrash = { controller: "mine", zone: "hand" };
const grantExecute = { kind: "GainKeyword", target: { filter: iliad, count: 1 }, keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd", cost: { kind: "trash", target: { filter: handTrash, count: 1 } }, optional: false, abortOnDecline: true };
const grantAscension = { kind: "GainKeyword", target: { filter: iliad, count: 1 }, keyword: { keyword: "Ascension" }, duration: "untilEachTurnEnd", condition: { kind: "ifThisEffectActed" } };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: eligibleSecurityCard, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true }] },
    { trigger: "OnPlay", actions: [grantExecute, grantAscension] },
    { trigger: "WhenDigivolving", actions: [grantExecute, grantAscension] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-030", compiled);
