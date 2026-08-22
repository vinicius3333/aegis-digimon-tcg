// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const xrosHeart = { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] }, from: ["trash"] };
const compiled: CompiledCard = {
  effects: [{ trigger: "OnPlay", actions: [
    { kind: "PlaceUnder", target: { ...xrosHeart, count: 1 }, underFilter: { controller: "mine", kind: ["Tamer"] } },
    { kind: "PlaceUnder", target: { ...xrosHeart, count: 2, upTo: true }, underFilter: { controller: "mine", kind: ["Tamer"] }, condition: { kind: "youHave", filter: { zone: "digivolutionCards", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Dorulumon"], match: "name" }] }, raw: "you have a Digimon with [Dorulumon] in its name or with [Dorulumon] in its digivolution cards" } },
  ] }],
  coverage: "full", residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Xros Heart"], cost: 0, isAlternate: true }],
};

registerIrCard("BT11-034", compiled);
