import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored module (header removed so the generator preserves it). Re-classified from the
// runtime record's inert `Restrict {restriction:"activateEffects"}` to the dedicated
// `DisableTimingEffect` action — the timing half of the source rule implementation split.
//
// `card.Owner.MemoryForPlayer >= 1 && opponent permanent && !TopCard.CanNotBeAffected(...) &&
// cardEffect.IsWhenDigivolving`. While owner memory is 1+, the opponent's Digimon do not
// activate their [When Digivolving] effects — unless the affected Digimon carries effect
// immunity (the `beAffected` exception, the source CanNotBeAffected gate).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      timing: "endOfBattle",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 2,
          },
          keyword: { keyword: "SecurityAttack", amount: -1 },
          duration: "forTheTurn",
        },
        {
          kind: "AddToHandSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      condition: { kind: "memoryAtLeast", value: 1 },
      actions: [
        {
          kind: "DisableTimingEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          timings: ["whenDigivolving"],
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ cost: 3, isAlternate: true, level: 5, traits: ["DS"] }],
};

registerIrCard("EX8-035", compiled);
