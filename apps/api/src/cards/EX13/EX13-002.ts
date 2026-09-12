import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// DemiVeemon (Digi-Egg).
//
// [Rule] Name: Not treated as including [Vee].
//   Executed by shared nameIncludesToken's standardized English name exclusions.
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
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-002", compiled);
