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
        // Both event forms carry the same `oncePerTurnKey`, so "played OR deleted" consumes ONE
        // physical [Once Per Turn] use. Without it each watcher kept its own per-turn budget and
        // the clause fired twice a turn.
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          oncePerTurnKey: "EX10-058/all-turns",
          actions: [playOnOpponentChange],
        },
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          oncePerTurnKey: "EX10-058/all-turns",
          actions: [playOnOpponentChange],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // No `digivolutionRequirement`: the catalog's Purple/Lv.5/cost-3 row is the PRINTED EvoCost
  // and this card prints no `[Digivolve]` header. `matchingAlternateDigivolutionRequirement`
  // reads every entry here as an ALTERNATE route, so restating the printed row registered an
  // unprinted second route (and the entry was also missing the required `isAlternate`).
  digiXrosRequirement: [
    {
      materials: [{ traits: ["Bagra Army"] }],
      count: 2,
      costReduction: 2,
      maxMaterials: 2,
    },
  ],
};

export { compiled };

registerIrCard("EX10-058", compiled);
