// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const securityCondition = { kind: "raw", raw: "there're 6 or fewer total cards in both players' security stacks" };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [
      { kind: "GainMemory", amount: 3, condition: securityCondition },
      { kind: "RevealAdd", revealCount: 1, add: [{ filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1, to: "security", toTop: true, orDispositions: [{ to: "hand", filter: { controllerDefault: "mine" } }] }], rest: "deckBottom", condition: securityCondition },
    ] },
    { trigger: "WhenDigivolving", actions: [
      { kind: "GainMemory", amount: 3, condition: securityCondition },
      { kind: "RevealAdd", revealCount: 1, add: [{ filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1, to: "security", toTop: true, orDispositions: [{ to: "hand", filter: { controllerDefault: "mine" } }] }], rest: "deckBottom", condition: securityCondition },
    ] },
    { trigger: "WhenAttacking", actions: [
      { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 } }, optional: true, abortOnDecline: true },
      { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -7000, duration: "forTheTurn" },
    ], frequency: "OncePerTurn" },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-046", compiled);
