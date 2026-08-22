// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHaveNone", filter: { controllerDefault: "mine" }, raw: "you have no face-up security cards" } }] },
    { trigger: "AllTurns", isSecurity: true, actions: [{ kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] }, count: "all" }, amount: 1000, duration: "permanent", scaling: { per: 1, filter: { controller: "mine", faceDown: true }, unit: "digivolutionCardsOfFiltered" } }] },
    { trigger: "Main", actions: [
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
    ] },
    { trigger: "Security", isSecurity: true, optional: true, actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", playCostLte: 5, nameOrTrait: [{ tokens: ["DM"], match: "trait" }] }, count: 1 }, from: ["hand", "trash"], payCost: false }] },
  ],
  coverage: "full", residual: [],
};

registerIrCard("EX9-072", compiled);
