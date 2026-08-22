// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const bonusActions = [
  { kind: "GainKeyword", keyword: { keyword: "Piercing" }, target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }, { tokens: ["TS"], match: "trait" }] } }, duration: "forTheTurn" },
  { kind: "ModifyDP", amount: 3000, duration: "forTheTurn", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }, { tokens: ["TS"], match: "trait" }] } } },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: bonusActions },
    { trigger: "OnMove", actions: bonusActions },
    { trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn", target: { isSelf: true } }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-008", compiled);
