// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const beatbreak = { nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] };
const placeHandCost = {
  kind: "place",
  target: { filter: { controller: "mine", zone: "hand", ...beatbreak }, count: 1 },
  underFilter: self.filter,
  host: "self",
  destination: "digivolutionStack",
  position: "bottom",
  faceDown: true,
};
// `position: "top"` is the fromDeckTop encoding for the TRUE bottom of the cards under this
// Tamer (Q7137/Q6415): the engine's fromDeckTop branch reads `position !== "top"` as belowTop.
const placeDeckTop = {
  kind: "PlaceUnder",
  fromDeckTop: true,
  target: { filter: {}, count: 1 },
  position: "top",
  faceDown: true,
};
const removalGate = { kind: "triggerRemovedSecuritySeat", seat: "mine" };
const nonEffectRemovalGate = {
  kind: "allOf",
  conditions: [removalGate, { kind: "not", condition: { kind: "triggerSecurityRemovedByEffect" } }],
};
const suspendCost = { kind: "suspend", target: self };
const gatedRemovalBody = (actions) => ({
  kind: "CostGatedBlock",
  cost: suspendCost,
  optional: true,
  abortOnDecline: true,
  actions,
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: placeHandCost,
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: nonEffectRemovalGate,
          actions: [gatedRemovalBody([placeDeckTop])],
          raw: "When your security stack is removed from, by suspending this Tamer, place the top card of your deck face down under this Tamer.",
        },
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          fireCondition: removalGate,
          actions: [
            gatedRemovalBody([
              placeDeckTop,
              {
                kind: "GainKeyword",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                keyword: { keyword: "SecurityAttack", amount: -1 },
                duration: "untilOpponentTurnEnd",
              },
            ]),
          ],
          raw: "When your security stack is removed from by an effect, suspend this Tamer, place the top card of your deck face down under it, then give 1 opposing Digimon Security A. -1.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-089", compiled);
