// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Insectoid", "Ten Warriors"], match: "trait" }],
      },
      payCost: true,
      from: ["hand"],
      costOverride: 3,
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Hybrid", "Insectoid"], match: "trait" }] },
        raw: "a card with [Hybrid] or [Insectoid] in its traits is in this Digimon's digivolution cards",
      },
      raw: "This Digimon can digivolve into a Digimon card with [Insectoid] or [Ten Warriors] in its traits in your hand for a memory cost of 3.",
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-051", compiled);
