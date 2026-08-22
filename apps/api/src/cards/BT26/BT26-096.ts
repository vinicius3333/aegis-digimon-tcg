// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playable = {
  controllerDefault: "mine",
  orFilters: [
    { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }] },
    { kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: playable, count: 1 },
          from: ["hand", "trash"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true }, count: 1 },
            to: "deckBottom",
          },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1 }, payCost: false }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-096", compiled);
