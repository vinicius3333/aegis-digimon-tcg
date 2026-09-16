import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const richardSampson: Filter = {
  controller: "mine",
  nameOrTrait: [{ tokens: ["Richard Sampson"], match: "nameExact" }],
};

const playRichardSampson = (): Action => ({
  kind: "PlayWithoutCost",
  target: { filter: richardSampson, count: 1 },
  from: ["hand", "trash"],
  payCost: false,
  cost: {
    kind: "trash",
    target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
    raw: "By trashing your top security card",
  },
  optional: true,
  abortOnDecline: true,
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [playRichardSampson()],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [playRichardSampson()],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [playRichardSampson()],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true }],
};

registerIrCard("EX13-030", compiled);
