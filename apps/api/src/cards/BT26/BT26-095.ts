// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const beatbreak = { nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] };
const startCost = { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand", ...beatbreak }, count: 1 }, underFilter: self.filter, faceDown: true };
const deletionBody = [
  { kind: "Draw", controller: "mine", amount: 1, cost: { kind: "suspend", target: self } },
  { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
  { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "trash", kind: ["Digimon", "Tamer", "Option"], ...beatbreak, isDigiEgg: false }, count: 1 }, underFilter: self.filter, faceDown: true },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [startCost, { kind: "Draw", controller: "mine", amount: 1 }, { kind: "GainMemory", amount: 1 }] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { kind: ["Digimon"] }, actions: deletionBody, raw: "When any Digimon are deleted, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand. After, place 1 [BEATBREAK] trait non-Digi-Egg card from your trash face down under this Tamer." }] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-095", compiled);
