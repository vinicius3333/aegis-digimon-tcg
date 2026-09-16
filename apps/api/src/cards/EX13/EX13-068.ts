import type { CompiledCard, CostGatedBlockAction } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playSelfNamed: CostGatedBlockAction = {
  kind: "CostGatedBlock",
  cost: {
    kind: "return",
    to: "deckBottom",
    target: {
      filter: { isSelfRef: true },
      count: 1,
      isSelf: true,
    },
    raw: "By returning this Tamer to the bottom of the deck",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      optional: true,
    },
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Guilmon"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["trash"],
      payCost: false,
      condition: {
        kind: "youHaveNone",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          zone: "battleArea",
        },
        raw: "you don't have a Digimon",
      },
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [playSelfNamed],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-068", compiled);
