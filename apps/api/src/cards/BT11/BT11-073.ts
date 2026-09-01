import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "forTheTurn",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                kind: ["Digimon"],
                levels: [6],
                excludeNames: ["Justimon: Accel Arm"],
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            excludeNames: ["Justimon: Accel Arm"],
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Justimon"], match: "name" }],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 2,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: { kind: ["Tamer"] },
          },
          optional: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Justimon"], cost: 1, isAlternate: true }],
};

registerIrCard("BT11-073", compiled);
