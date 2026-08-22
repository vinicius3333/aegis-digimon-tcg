// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const titan = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] };
const titanCard = { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] };
const titanDigimon = { ...titan, levelLte: 4 };
const noFaceUpSecurity = { kind: "securityAtMost", controller: "mine", value: 0 };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: noFaceUpSecurity }] },
    { trigger: "Static", isSecurity: true, actions: [
      { kind: "GainKeyword", target: { filter: titan, count: "all" }, keyword: { keyword: "Blocker" }, duration: "permanent" },
      { kind: "ModifyDP", target: { filter: titan, count: "all" }, amount: 3000, duration: "permanent", condition: { kind: "youHave", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Plutomon", "Titamon"], match: "name" }] } } },
    ] },
    { trigger: "Main", actions: [
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
      { kind: "PlayWithoutCost", target: { filter: titanCard, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true },
    ] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: titanDigimon, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-100", compiled);
