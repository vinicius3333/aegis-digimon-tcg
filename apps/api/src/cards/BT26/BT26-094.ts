// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const dataSquad = { nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] };
const executeTarget = { filter: { controller: "mine", kind: ["Digimon"], ...dataSquad }, count: 1 };
const executeReaction = [
  { kind: "Suspend", target: self },
  { kind: "GainKeyword", target: executeTarget, keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd" },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [
      { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand", ...dataSquad }, count: 1 }, underFilter: self.filter, faceDown: true },
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ] },
    { trigger: "YourTurn", actions: [
      { kind: "SubTrigger", event: "whenHandTrashed", fireCondition: { kind: "triggerHandTrashedSeat", seat: "opponent" }, actions: executeReaction, raw: "When your opponent's hand is trashed from, by suspending this Tamer, 1 of your DATA SQUAD Digimon gains Execute for the turn." },
      { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }, hostFilter: { isSelfRef: true }, actions: executeReaction, raw: "When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your DATA SQUAD Digimon gains Execute for the turn." },
    ] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-094", compiled);
