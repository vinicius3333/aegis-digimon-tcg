import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const textOrTs: NonNullable<Filter["nameOrTrait"]> = [
  { tokens: ["Three Musketeers"], match: "text" },
  { tokens: ["TS"], match: "trait" },
];
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand", nameOrTrait: textOrTs }, count: 1 },
          optional: true,
          abortOnDecline: true,
          raw: "By trashing 1 card with [Three Musketeers] in its text or the [TS] trait from your hand",
        },
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                kind: ["Option"],
                hostFilter: { controller: "mine", kind: ["Digimon"] },
              },
              orFilters: [{ controller: "mine", kind: ["Option"], zone: "hand" }],
              from: ["hand", "digivolutionCards"],
              count: 1,
            },
          },
          abortOnDecline: true,
        },
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: textOrTs },
          from: ["hand", "trash"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [],
};

registerIrCard("BT25-092", compiled);
