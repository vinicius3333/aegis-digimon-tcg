// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "digivolutionCards",
          fromTriggers: ["WhenDigivolving"],
          filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Justimon"], match: "name" }] },
          count: 1,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      optional: true,
      condition: {
        kind: "opponentHas",
        filter: { controllerDefault: "opponent", kind: ["Digimon"], unsuspended: true },
        raw: "your opponent has an unsuspended Digimon",
      },
      actions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          attackPlayer: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 6, names: ["Justimon"], excludeTraits: ["X Antibody"], cost: 1, isAlternate: true },
  ],
};

registerIrCard("EX8-054", compiled);
