// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Gaia Reactor: choose one highest-play-cost Digimon for each player, then delete all
// other Digimon. The same effect resolves when the Option is revealed in security.
const deleteOthers = () => [
  {
    kind: "SelectBind",
    target: {
      filter: { controller: "mine", kind: ["Digimon"], superlative: "highestPlayCost" },
      count: 1,
      bindAs: "sparedMine",
      upTo: true,
    },
  },
  {
    kind: "SelectBind",
    target: {
      filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" },
      count: 1,
      bindAs: "sparedOpponent",
      upTo: true,
    },
  },
  {
    kind: "Delete",
    target: {
      filter: { controller: "mine", kind: ["Digimon"], excludeSelectionRef: ["sparedMine"] },
      count: "all",
    },
  },
  {
    kind: "Delete",
    target: {
      filter: { controller: "opponent", kind: ["Digimon"], excludeSelectionRef: ["sparedOpponent"] },
      count: "all",
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: deleteOthers() },
    { trigger: "Security", isSecurity: true, actions: deleteOthers() },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-069", compiled);
