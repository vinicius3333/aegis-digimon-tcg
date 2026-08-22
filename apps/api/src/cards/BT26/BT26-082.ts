// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const highestDp = { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 };
const deleteOwn = { kind: "deleteOwn", target: self };
const trashTwoTamerBottoms = { kind: "trash", target: { filter: { controller: "mine", zone: "digivolutionCards", faceDown: true, position: "bottom", hostFilter: { kind: ["Tamer"] } }, count: 2 } };
const altCostDelete = { kind: "Modal", choose: 1, options: [
  [{ kind: "Delete", target: highestDp, cost: deleteOwn }],
  [{ kind: "Delete", target: highestDp, cost: trashTwoTamerBottoms }],
] };
const playFromSecurity = { kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Security", isSecurity: true, actions: [playFromSecurity] },
    { trigger: "EndOfOpponentsTurn", isSecurity: true, actions: [playFromSecurity] },
    { trigger: "WhenDigivolving", actions: [altCostDelete] },
    { trigger: "EndOfAttack", actions: [altCostDelete] },
    { trigger: "OnDeletion", actions: [
      { kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", source: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["trash"], toTop: false, faceUp: true, optional: true, condition: { kind: "handAtMost", controller: "opponent", value: 7 } },
    ] },
    { trigger: "Static", actions: [{ kind: "GrantStatic", target: self, grant: "trait", tokens: ["Birdkin"], duration: "permanent" }] },
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
