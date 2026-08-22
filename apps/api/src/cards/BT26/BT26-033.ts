// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ts = { controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const iliad = { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Raid", raw: "＜Raid＞" }, { keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Engage", raw: "＜Engage＞" }],
  effects: [
    { trigger: "WhenDigivolving", actions: [
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, source: "securityTop" },
      { kind: "RawUnparsed", text: "If it is your turn, you may play or use 1 Iliad card from your hand with its cost reduced by 5." },
    ] },
    { trigger: "Static", actions: [
      { kind: "CostModifier", costType: "use", mode: "delta", amount: 1, target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, handResident: true, duration: "permanent", scaling: { unit: "security", per: 1, filter: { controller: "mine" } } },
      { kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHave", filter: ts } },
      { kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", sourceFilter: ts, raw: "When your TS Digimon or Tamer would leave, by placing this Digimon's top stacked card as bottom security, it doesn't leave.", cost: { kind: "placeAsSecurity", target: { filter: { isSelfRef: true, zone: "digivolutionCards", position: "top" }, count: 1 }, position: "bottom" }, actions: [] },
    ] },
    { trigger: "Main", actions: [
      { kind: "Delete", target: { filter: opponentDigimon, count: "all", superlative: "lowestDP" } },
      { kind: "SecurityManipulation", op: "placeFromDeck", controller: "mine", source: "deck", amount: 1 },
    ] },
  ],
  coverage: "partial",
  residual: ["The When Digivolving 'if it's your turn' condition is not represented by a dedicated IR condition; the branch remains explicit and requires gate validation."],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 4, isAlternate: true }],
};

registerIrCard("BT26-033", compiled);
