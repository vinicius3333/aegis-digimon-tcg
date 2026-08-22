// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const whenDigivolving = [
  {
    kind: "Delete",
    target: {
      filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } },
      count: 1,
    },
  },
  {
    kind: "Return",
    target: {
      filter: {
        controllerDefault: "opponent",
        kind: ["Digimon"],
        levelComparison: { op: "gte", value: 6 },
      },
      count: 1,
    },
    to: "deckBottom",
  },
];

const leaveReplacement = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  leaveCause: "otherThanYourEffect",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  actions: [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["BlitzGreymon"], match: "nameExact" }] },
        count: 1,
      },
      from: ["digivolutionCards"],
      payCost: false,
      optional: true,
    },
    {
      kind: "PlayWithoutCost",
      target: {
        filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CresGarurumon"], match: "nameExact" }] },
        count: 1,
      },
      from: ["digivolutionCards"],
      payCost: false,
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: whenDigivolving },
    {
      trigger: "AllTurns",
      actions: [
        leaveReplacement,
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "mine",
          amount: 1,
          source: "this",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-060", compiled);
