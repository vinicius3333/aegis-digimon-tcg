// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const beatbreak = { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] }, count: 1 };
const startCost = { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] }, count: 1 }, underFilter: self.filter, faceDown: true };
const attackBody = [
  { kind: "Suspend", target: self },
  { kind: "PlaceUnder", fromDeckTop: true, target: self, faceDown: true },
  { kind: "GainKeyword", target: beatbreak, keyword: { keyword: "Collision" }, duration: "untilEachTurnEnd" },
  { kind: "GainKeyword", target: beatbreak, keyword: { keyword: "Blocker" }, duration: "untilEachTurnEnd" },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [startCost, { kind: "Draw", controller: "mine", amount: 1 }, { kind: "GainMemory", amount: 1 }] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenAttacking", actions: attackBody, raw: "When a Digimon attacks, by suspending this Tamer, place the top card of your deck face down under this Tamer. After, 1 of your [BEATBREAK] trait Digimon gains ＜Collision＞ and ＜Blocker＞ for the turn." }] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-093", compiled);
