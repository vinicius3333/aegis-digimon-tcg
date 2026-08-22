// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "OnPlay",
    actions: [{
      kind: "RevealAdd",
      revealCount: 1,
      add: [{ filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"] }, count: 1, to: "hand" }],
      rest: "deckBottom",
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST4-03", compiled);
