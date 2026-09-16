import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const chronicleTrait = [{ tokens: ["Chronicle"], match: "trait" as const }];

const drawAndGainMemory: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "trash",
    target: {
      count: 1,
      filter: { zone: "hand", controller: "mine", nameOrTrait: chronicleTrait },
    },
    raw: "By trashing 1 [Chronicle] trait card from your hand",
  },
  optional: true,
  abortOnDecline: true,
  raw: "By trashing 1 [Chronicle] trait card from your hand, ＜Draw 1＞ and gain 1 memory.",
  actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "GainMemory", amount: 1 },
  ],
};

const chronicleOrXAntibodyOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }, ...chronicleTrait],
};

const useDiscountedOption: Action = {
  kind: "SubTrigger",
  event: "whenAttacking",
  sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: chronicleTrait },
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  actions: [
    {
      kind: "UseOptionWithoutCost",
      filter: chronicleOrXAntibodyOption,
      from: ["hand"],
      payCost: true,
      reduceCostBy: 1,
      optional: true,
      raw: "you may use 1 [X Antibody] or 1 Option card with the [Chronicle] trait from your hand with the cost reduced by 1",
    },
  ],
  raw: "When one of your [Chronicle] trait Digimon attacks, by suspending this Tamer, you may use 1 [X Antibody] or 1 Option card with the [Chronicle] trait from your hand with the cost reduced by 1",
};

const startOfMainPhase: CardEffect = { trigger: "StartOfYourMainPhase", actions: [drawAndGainMemory] };
const yourTurn: CardEffect = { trigger: "YourTurn", actions: [useDiscountedOption] };
const security: CardEffect = {
  trigger: "Security",
  isSecurity: true,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      payCost: false,
      raw: "[Security] Play this card without paying the cost.",
    },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-072",
  effects: [startOfMainPhase, yourTurn, security],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-072", compiled);
