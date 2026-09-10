import type { Action, CompiledCard, EffectDurationRef, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const iliad = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
} satisfies Filter;
const eligibleSecurityCard = {
  controllerDefault: "mine",
  kind: ["Digimon", "Tamer"],
  playCostLte: 4,
  nameOrTrait: [
    { tokens: ["Angel"], match: "trait" },
    { tokens: ["TS"], match: "trait" },
  ],
} satisfies Filter;
const handTrash = { controller: "mine", zone: "hand" } satisfies Filter;
const grantKeywords = {
  kind: "CostGatedBlock",
  cost: { kind: "trash", target: { filter: handTrash, count: 1 } },
  optional: true,
  abortOnDecline: true,
  actions: [
    { kind: "SelectBind", target: { filter: iliad, count: 1, bindAs: "pumpkinmonIliad" } },
    {
      kind: "GainKeyword",
      target: { filter: {}, count: 1, fromSelectionRef: "pumpkinmonIliad" },
      keyword: { keyword: "Execute" },
      duration: "untilEachTurnEnd" as EffectDurationRef,
    },
    {
      kind: "GrantStatic",
      target: { filter: {}, count: 1, fromSelectionRef: "pumpkinmonIliad" },
      grant: "effects",
      tokens: ["Execute"],
      duration: "untilEachTurnEnd" as EffectDurationRef,
    },
    {
      kind: "GainKeyword",
      target: { filter: {}, count: 1, fromSelectionRef: "pumpkinmonIliad" },
      keyword: { keyword: "Ascension" },
      duration: "untilEachTurnEnd" as EffectDurationRef,
    },
  ] satisfies Action[],
} satisfies Action;

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
