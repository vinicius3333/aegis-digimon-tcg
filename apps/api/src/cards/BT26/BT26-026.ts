// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const glowingDawnOption = { controllerDefault: "mine", zone: "hand", kind: ["Option"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] };
const useGlowingDawn = (cost) => ({ kind: "UseOptionWithoutCost", filter: glowingDawnOption, from: ["hand"], payCost: true, reduceCostBy: 2, cost, optional: true });

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Modal", choose: 1, options: [
      [useGlowingDawn({ kind: "trashBottomFaceDownUnderTamer", controller: "mine" })],
      [useGlowingDawn({ kind: "trashSecurityTop", controller: "mine" })],
    ] }] },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-026", compiled);
