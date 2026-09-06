import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              includesSelf: true,
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["VB"],
                match: "trait",
              },
            ],
            hasDnaDigivolutionRequirement: true,
          },
          payCost: true,
          optional: true,
          bindResultAs: "dnaResult",
          condition: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["VB"], match: "trait" }],
            },
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              boundRef: "dnaResult",
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX12-001", compiled);
