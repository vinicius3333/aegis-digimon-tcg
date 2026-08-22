// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", optional: true, actions: [{ kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand" }, count: 1, from: ["hand"] }, underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] }, position: "bottom", faceDown: true }] },
    { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", addedDigivolutionCardFilter: { faceDown: true }, sourceFilter: { controller: "mine", kind: ["Digimon"] }, actions: [
      { kind: "GainMemory", amount: 1, cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } } },
      { kind: "Draw", controller: "mine", amount: 1, condition: { kind: "handAtMost", value: 7 } },
    ], raw: "When face-down cards are placed as any of your Digimon's digivolution cards" }] },
    { trigger: "OpponentsTurn", actions: [{ kind: "GainKeyword", target: { filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "hasAny", faceDown: true }, count: "all" }, keyword: { keyword: "Reboot", raw: "＜Reboot＞" }, duration: "untilOpponentTurnEnd" }] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }] },
  ], coverage: "full", residual: [],
};
registerIrCard("EX9-069", compiled);
