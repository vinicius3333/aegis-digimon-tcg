// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const chronomonOrTitan = {
  nameOrTrait: [
    { tokens: ["Chronomon"], match: "text" },
    { tokens: ["Titan"], match: "trait" },
  ],
};
const eligibleTrashCard = { controller: "mine", zone: "trash", kind: ["Digimon", "Tamer", "Option"], playCostLte: 12, ...chronomonOrTitan };
const deleteToPlay = {
  kind: "PlayWithoutCost",
  target: { filter: eligibleTrashCard, count: 1 },
  from: ["trash"],
  payCost: false,
  optional: true,
  cost: { kind: "delete", target: self },
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [deleteToPlay] },
    { trigger: "WhenDigivolving", actions: [deleteToPlay] },
    {
      trigger: "Trash",
      isFromTrash: true,
      actions: [{
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controller: "mine", kind: ["Digimon"], ...chronomonOrTitan },
        actions: [
          { kind: "Return", to: "deckBottom", target: self, optional: true, abortOnDecline: true },
          { kind: "GainKeyword", target: { sourceRef: "triggerSubject", filter: {}, count: 1 }, keyword: { keyword: "Rush" }, duration: "untilEachTurnEnd" },
          { kind: "GainKeyword", target: { sourceRef: "triggerSubject", filter: {}, count: 1 }, keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd" },
        ],
        fireCondition: { kind: "allOf", conditions: [{ kind: "isYourTurn" }, { kind: "memoryAtLeast", value: 5, controller: "opponent" }], raw: "it's your turn and your opponent has 5 or more memory" },
      }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 5, isAlternate: true }],
};

registerIrCard("BT26-078", compiled);
export default compiled;
