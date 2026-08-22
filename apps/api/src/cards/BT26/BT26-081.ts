// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const iliad = { controller: "mine", zone: "battleArea", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };
const iliadHandOrTrash = { controller: "mine", kind: ["Digimon", "Tamer", "Option"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };
const iliadOrTs = { controller: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Iliad", "TS"], match: "trait" }] };

const main = [
  { kind: "PlayMultiple", filter: iliadHandOrTrash, from: ["hand", "trash"], payCost: false, totalCost: 8, optional: true },
  { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -4000, duration: "untilOpponentTurnEnd", scaling: { per: 1, unit: "cards", filter: iliadOrTs } },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: main },
    { trigger: "WhenDigivolving", actions: main },
    { trigger: "AllTurns", actions: [
      { kind: "GainKeyword", target: { filter: iliad, count: "all" }, keyword: { keyword: "Alliance" }, duration: "permanent" },
      { kind: "GainKeyword", target: { filter: iliad, count: "all" }, keyword: { keyword: "Reboot" }, duration: "permanent" },
      { kind: "GainKeyword", target: { filter: iliad, count: "all" }, keyword: { keyword: "Blocker" }, duration: "permanent" },
      { kind: "ModifyDP", target: { filter: iliad, count: "all" }, amount: 2000, duration: "permanent" },
    ] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Minervamon"], cost: 2, isAlternate: true },
    { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
  ],
  assemblyRequirement: [{ reduceCost: 5, materials: [{ names: ["Minervamon"], count: 1 }] }],
};

registerIrCard("BT26-081", compiled);
export default compiled;
