import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const traits = [{ tokens: ["Ice-Snow", "Mineral", "Rock"], match: "trait" as const }];

const placeAndProtect: Action = {
  kind: "CostGatedBlock",
  optional: true,
  abortOnDecline: true,
  cost: {
    kind: "place",
    target: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        levelComparison: { op: "lte", value: 4 },
        nameOrTrait: traits,
      },
      count: 1,
      from: ["hand", "trash"],
    },
    destination: "digivolutionStack",
    position: "bottom",
    host: "self",
    raw: "by placing 1 level 4 or lower Ice-Snow, Mineral, or Rock card under this Digimon",
  },
  actions: [
    {
      kind: "SelectBind",
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: traits },
        count: 1,
        bindAs: "protectedDigimon",
      },
    },
    {
      kind: "Restrict",
      target: { filter: {}, count: 1, fromSelectionRef: "protectedDigimon" },
      restriction: "beReturned",
      duration: "untilOpponentTurnEnd",
      byOpponentEffectsOnly: true,
    },
    {
      kind: "Restrict",
      target: { filter: {}, count: 1, fromSelectionRef: "protectedDigimon" },
      restriction: "cantBeDeDigivolved",
      duration: "untilOpponentTurnEnd",
      byOpponentEffectsOnly: true,
    },
  ],
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenMoving", actions: [placeAndProtect] },
    { trigger: "OnPlay", actions: [placeAndProtect] },
    { trigger: "WhenDigivolving", actions: [placeAndProtect] },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Ice-Snow", "Mineral", "Rock"], cost: 2, isAlternate: true }],
};

registerIrCard("P-215", compiled);
