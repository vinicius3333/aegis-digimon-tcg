import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              // "1 [Virus] trait Digimon card WITH [Greymon] in its name" is a CONJUNCTION.
              // A two-entry `nameOrTrait` array cannot express it: `definitionMatches` treats
              // that array as a UNION (`filter.nameOrTrait.some(...)`), so the pair matched any
              // Virus Digimon OR any Greymon-named Digimon — BT1-015 (Vaccine Greymon) and
              // EX10-006 itself (Virus Agumon) both qualified. `traits` is checked as its own
              // AND-ed clause, so splitting the trait half onto it restores the printed gate.
              traits: ["Virus"],
              nameOrTrait: [
                {
                  tokens: ["Greymon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koromon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

export { compiled };

registerIrCard("EX10-006", compiled);
