// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [
      { kind: "Digivolve", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, into: { name: "MirageGaogamon" }, payCost: false, reduceCost: 0 },
      { kind: "Return", target: { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "name" }] }, count: 1 }, to: "hand" },
      { kind: "TrashDigivolution", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 1, position: "top" },
      { kind: "GainMemory", amount: 1, scaling: { per: 4, filter: { zone: "hand", controller: "opponent" }, unit: "cards" } },
    ] },
    { trigger: "WhenAttacking", actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 9, raw: "your opponent has 9 or more cards in their hand" }, cost: { kind: "return", target: { filter: { zone: "hand", controller: "opponent" }, count: 1 }, to: "deckBottom" }, optional: true, abortOnDecline: true }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-033", compiled);
