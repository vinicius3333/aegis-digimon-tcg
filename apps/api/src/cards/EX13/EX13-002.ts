import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// DemiVeemon (Digi-Egg).
//
// [Rule] Name: Not treated as including [Vee].
//   Not modelled: the engine has no per-card name-exclusion seam. `matchNameOrTrait`
//   (apps/api/src/engine/effects/interpreter/matching/definition.ts) resolves a
//   `match: "name"` ref by plain substring against the effective names, so
//   "DemiVeemon" still answers a "[Vee] in its name" ref. Kept in `residual`.
//
// [Your Turn] [Once Per Turn] inherited: when any of your blue Tamers are played, the
// host Digimon with [Veedramon] in its name may unsuspend. "[Veedramon] in its name" is
// a substring ref, so AeroVeedramon/UlforceVeedramon hosts qualify and a plain Veemon
// host does not.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            colors: ["Blue"],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                  nameOrTrait: [
                    {
                      tokens: ["Veedramon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "partial",
  residual: ["[Rule] Name: Not treated as including [Vee]."],
};

registerIrCard("EX13-002", compiled);
