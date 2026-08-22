// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, add: [
      { filter: { nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] }, count: 1, to: "hand" },
      { filter: { colors: ["Black"], nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] }, count: 1, to: "hand" },
    ], rest: "deckBottom" }] },
    { trigger: "None", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "permanent" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Glowing Dawn"], cost: 0, isAlternate: true }],
};

registerIrCard("BT26-052", compiled);
