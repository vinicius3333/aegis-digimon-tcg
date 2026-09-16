import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart: "Then, that DNA digivolved Digimon may attack.",
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
