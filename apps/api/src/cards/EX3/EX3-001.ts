// Hand-authored override (errata 2022-11-11): "When A Digimon with [Dramon]/[Examon]...
// becomes unsuspended" -> "When THIS Digimon with [Dramon] or [Examon]... becomes
// unsuspended, +1000 DP". The trigger is scoped to THIS Digimon, so the +1000 DP target
// is self-ref. Fired via the whenUnsuspended SubTrigger gated on the self source.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          raw: "when THIS Digimon with [Dramon] or [Examon] becomes unsuspended, +1000 DP",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Dramon", "Examon"],
                match: "name",
              },
            ],
          },
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
              duration: "forTheTurn",
              condition: { kind: "selfHasNameContaining", names: ["Dramon", "Examon"] },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-001", compiled);
export default compiled;
