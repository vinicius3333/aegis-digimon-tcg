import type { Action, CompiledCard, Filter, Scaling } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const imperialdramonOrFree: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  zone: "hand",
  nameOrTrait: [
    { tokens: ["Imperialdramon"], match: "name" },
    { tokens: ["Free"], match: "trait" },
  ],
};

const freeDigimon: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  zone: "hand",
  nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
};

const opponentDigimonScaling: Scaling = {
  per: 1,
  unit: "cards",
  filter: { controller: "opponent", kind: ["Digimon"] },
};

const activateOneEffect: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "By suspending this Tamer",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "Modal",
      choose: 1,
      labels: ["Digivolve 1 of your Digimon", "DNA digivolve 2 of your Digimon"],
      options: [
        [
          {
            kind: "Digivolve",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            into: imperialdramonOrFree,
            from: ["hand"],
            payCost: true,
            reduceCostScaling: opponentDigimonScaling,
            optional: true,
          },
        ],
        [
          {
            kind: "DnaDigivolve",
            materials: {
              filter: { controller: "mine", kind: ["Digimon"] },
              count: 2,
            },
            into: freeDigimon,
            payCost: true,
            optional: true,
          },
        ],
      ],
    },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-070",
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    { trigger: "EndOfYourTurn", actions: [activateOneEffect] },
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

registerIrCard("EX13-070", compiled);
