// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const beatbreak = { nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] };
const placeHandCost = { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand", ...beatbreak }, count: 1 }, underFilter: self.filter, faceDown: true };
const placeDeckTop = { kind: "PlaceUnder", fromDeckTop: true, target: self, faceDown: true };
const removalGate = { kind: "triggerRemovedSecuritySeat", seat: "mine" };
const commonRemovalBody = [{ kind: "Suspend", target: self }, placeDeckTop];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [placeHandCost, { kind: "Draw", controller: "mine", amount: 1 }, { kind: "GainMemory", amount: 1 }] },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenSecurityRemoved", fireCondition: removalGate, actions: commonRemovalBody, raw: "When your security stack is removed from, by suspending this Tamer, place the top card of your deck face down under this Tamer." },
        { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", fireCondition: removalGate, actions: [...commonRemovalBody, { kind: "GainKeyword", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }], raw: "When your security stack is removed from by an effect, suspend this Tamer, place the top card of your deck face down under it, then give 1 opposing Digimon Security A. -1." },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-089", compiled);
