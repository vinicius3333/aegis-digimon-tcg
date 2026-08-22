// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const anyDigimon = { filter: { kind: ["Digimon"] }, count: 1 };
const ts = { controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
    { keyword: "Succession", raw: "＜Succession ([Bacchusmon])＞" },
  ],
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: ts } }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "Attack", target: self, withoutSuspending: true, optional: true, cost: { kind: "suspend", target: anyDigimon } }] },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], sameOrientationAsSource: true }, count: 1 } }] },
    { trigger: "Main", actions: [
      { kind: "Unsuspend", target: anyDigimon, optional: true },
      { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true, superlative: "lowestDP" }, count: "all" } },
    ] },
  ],
  coverage: "partial",
  residual: ["Behavioral proof is pending for the live same-orientation target predicate used by When Attacking."],
  digivolutionRequirement: [{ names: ["Bacchusmon"], basePlayCost: 12, cost: 2, isAlternate: true }],
};

registerIrCard("BT26-080", compiled);
export default compiled;
