// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const traits = [{ tokens: ["Ice-Snow", "Mineral", "Rock"], match: "trait" as const }];

const placeAndProtect = {
  kind: "CostGatedBlock" as const,
  optional: true,
  abortOnDecline: true,
  cost: {
    kind: "place" as const,
    target: {
      filter: {
        controller: "mine" as const,
        kind: ["Digimon"] as const,
        levelComparison: { op: "lte" as const, value: 4 },
        nameOrTrait: traits,
      },
      count: 1,
      from: ["hand", "trash"] as const,
    },
    destination: "digivolutionStack" as const,
    position: "bottom" as const,
    host: "self" as const,
    raw: "by placing 1 level 4 or lower Ice-Snow, Mineral, or Rock card under this Digimon",
  },
  actions: [
    {
      kind: "SelectBind" as const,
      target: {
        filter: { controller: "mine" as const, kind: ["Digimon"] as const, nameOrTrait: traits },
        count: 1,
      },
      bindAs: "protectedDigimon",
    },
    {
      kind: "Restrict" as const,
      target: { filter: {}, count: 1, fromSelectionRef: "protectedDigimon" },
      restriction: "beReturned" as const,
      duration: "untilOpponentTurnEnd" as const,
      byOpponentEffectsOnly: true,
    },
    {
      kind: "Restrict" as const,
      target: { filter: {}, count: 1, fromSelectionRef: "protectedDigimon" },
      restriction: "cantBeDeDigivolved" as const,
      duration: "untilOpponentTurnEnd" as const,
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
