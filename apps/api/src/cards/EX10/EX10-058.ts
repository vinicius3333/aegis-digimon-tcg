// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playOnOpponentChange = {
  kind: "PlayWithoutCost" as const,
  target: {
    filter: {
      controller: "mine" as const,
      kind: ["Digimon" as const],
      colors: ["Purple" as const],
      levelComparison: { op: "lte" as const, value: 4 },
    },
    count: 1,
  },
  from: ["trash" as const],
  payCost: false,
  optional: true,
  cost: {
    kind: "trash" as const,
    target: { filter: { isSelfRef: true, zone: "digivolutionCards" as const }, count: 2 },
    raw: "By trashing any 2 of this Digimon's digivolution cards",
  },
};

const grantEndOfTurnDeletion = {
  kind: "GainTriggeredEffect" as const,
  target: {
    filter: { controller: "opponent" as const, kind: ["Digimon" as const, "Tamer" as const] },
    count: 1,
  },
  gainedTrigger: "EndOfYourTurn" as const,
  gainedActions: [
    {
      kind: "Delete" as const,
      target: { filter: { controller: "mine" as const, kind: ["Digimon" as const] }, count: 1 },
    },
  ],
  duration: "untilOpponentTurnEnd" as const,
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [grantEndOfTurnDeletion] },
    { trigger: "WhenDigivolving", actions: [grantEndOfTurnDeletion] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [playOnOpponentChange],
        },
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [playOnOpponentChange],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, colors: ["Purple"], cost: 3 }],
  digiXrosRequirement: [
    {
      materials: [{ traits: ["Bagra Army"] }],
      count: 2,
      costReduction: 2,
    },
  ],
};

export { compiled };

registerIrCard("EX10-058", compiled);
