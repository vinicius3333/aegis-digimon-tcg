// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const costDigimon = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Vegetation"], match: "trait" },
    { tokens: ["Fairy"], match: "trait" },
    { tokens: ["WG"], match: "trait" },
  ],
};
const opponentDigimon = { controllerDefault: "opponent", kind: ["Digimon"] };
const weaken = [
  {
    kind: "GainKeyword",
    target: { filter: opponentDigimon, count: 1 },
    keyword: { keyword: "SecurityAttack", amount: -2 },
    duration: "untilOpponentTurnEnd",
    optional: true,
    cost: { kind: "suspend", target: { filter: costDigimon, count: 1 } },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: weaken },
    { trigger: "StartOfOpponentsMainPhase", actions: weaken },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-027", compiled);
