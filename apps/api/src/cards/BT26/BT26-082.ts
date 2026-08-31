// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const highestDp = { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 };
const deleteOwn = { kind: "deleteOwn", target: self };
const trashTwoTamerBottoms = { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 2 };
const altCostDelete = {
  kind: "Modal",
  choose: 1,
  optional: true,
  abortOnDecline: true,
  options: [
    [{ kind: "Delete", target: highestDp, cost: deleteOwn }],
    [{ kind: "Delete", target: highestDp, cost: trashTwoTamerBottoms }],
  ],
};
const playFromSecurity = { kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false };

export const compiled: CompiledCard = {
  effects: [
    // KB Q7117/Q7122: this is a {Security} effect — activatable only while the card is FACE UP in
    // the security stack — timed at [End of Opponent's Turn]. It is not the classic check-triggered
    // [Security] tag (Q7120), which this card does not carry (no `securityEffectText` in the
    // catalog), so a security check must trash it like any other security card instead of playing it.
    { trigger: "EndOfOpponentsTurn", isSecurity: true, actions: [playFromSecurity] },
    { trigger: "WhenDigivolving", actions: [altCostDelete] },
    { trigger: "EndOfAttack", actions: [altCostDelete] },
    {
      trigger: "OnDeletion",
      actions: [
        { kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["trash"],
          toTop: false,
          faceUp: true,
          optional: true,
          condition: { kind: "handAtMost", controller: "opponent", value: 7 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [{ kind: "GrantStatic", target: self, grant: "trait", tokens: ["Birdkin"], duration: "permanent" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Crowmon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("BT26-082", compiled);
export default compiled;
