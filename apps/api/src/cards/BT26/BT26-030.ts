// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const iliad = { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };
const eligibleSecurityCard = {
  controllerDefault: "mine",
  kind: ["Digimon", "Tamer"],
  playCostLte: 4,
  nameOrTrait: [
    { tokens: ["Angel"], match: "trait" },
    { tokens: ["TS"], match: "trait" },
  ],
};
const handTrash = { controller: "mine", zone: "hand" };
const grantKeywords = {
  kind: "CostGatedBlock",
  cost: { kind: "trash", target: { filter: handTrash, count: 1 } },
  optional: true,
  abortOnDecline: true,
  actions: [
    { kind: "SelectBind", target: { filter: iliad, count: 1, bindAs: "pumpkinmonIliad" } },
    {
      kind: "GainKeyword",
      target: { fromSelectionRef: "pumpkinmonIliad" },
      keyword: { keyword: "Execute" },
      duration: "untilEachTurnEnd",
    },
    {
      kind: "GrantStatic",
      target: { fromSelectionRef: "pumpkinmonIliad" },
      grant: "effects",
      tokens: ["Execute"],
      duration: "untilEachTurnEnd",
    },
    {
      kind: "GainKeyword",
      target: { fromSelectionRef: "pumpkinmonIliad" },
      keyword: { keyword: "Ascension" },
      duration: "untilEachTurnEnd",
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: eligibleSecurityCard, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    { trigger: "OnPlay", actions: [grantKeywords] },
    { trigger: "WhenDigivolving", actions: [grantKeywords] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-030", compiled);
