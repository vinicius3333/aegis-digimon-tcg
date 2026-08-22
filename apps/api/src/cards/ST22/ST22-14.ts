// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const fallenAngel = {
  controller: "mine",
  kind: ["Digimon"],
  levelComparison: { op: "lte", value: 5 },
  nameOrTrait: [{ tokens: ["Fallen Angel"], match: "trait" }],
};
const handAtLeastSix = {
  kind: "zoneCount",
  seat: "opponent",
  zone: "hand",
  op: "gte",
  value: 6,
  raw: "your opponent has 6 or more cards in their hand",
};
const handAtMostFive = {
  kind: "zoneCount",
  seat: "opponent",
  zone: "hand",
  op: "lte",
  value: 5,
  raw: "they have 5 or fewer cards in their hand",
};
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 10 },
              { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
            ],
            raw: "your opponent has 10 or more cards in their hand or trash",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "opponent" }, count: "all" },
          untilHandSize: 6,
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: fallenAngel, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "opponent" }, count: "all" },
          untilHandSize: 6,
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: fallenAngel, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "opponent" }, count: 1 },
          untilHandSize: 5,
          condition: handAtLeastSix,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          condition: handAtMostFive,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["Fallen Angel", "CS"], cost: 3, isAlternate: true }],
};
registerIrCard("ST22-14", compiled);
