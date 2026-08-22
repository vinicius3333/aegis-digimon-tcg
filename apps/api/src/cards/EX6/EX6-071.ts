// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-071")!;

/** EX6-071 — Pandemonium Lost, with opponent hand cost and post-cost level boundary structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: generated.effects.map((effect) => effect.trigger === "Main" ? {
    ...effect,
    actions: [{
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 0, scaling: { per: 1, levelCeilingAdd: 1, filter: { zone: "hand", controller: "opponent" }, unit: "cards" } } }, count: 1 },
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "opponent" }, count: 1, chooser: "opponent" }, raw: "your opponent trashes 1 card in their hand" },
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 5, raw: "your opponent has 5 or more cards in their hand" },
      raw: "If your opponent has 5 or more cards in their hand, your opponent trashes 1 card in their hand. Then, delete 1 of your opponent's Digimon with a level greater than or equal to the cards in their hand."
    }]
  } : effect),
  coverage: "full",
  residual: []
};

registerIrCard("EX6-071", compiled);
