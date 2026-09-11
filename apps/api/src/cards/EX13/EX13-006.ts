import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Dorimon (EX13-006), Digi-Egg. Inherited only:
// [End of Your Turn] [Once Per Turn] By paying 1 cost, 1 of your Digimon with the
// [X Antibody] or [Chronicle] trait may unsuspend.
//
// The clause names "1 of your Digimon", not the host, so the target filter is a
// controller-scoped board filter rather than `isSelfRef`. The two bracketed traits are a
// union inside one `nameOrTrait` entry with `match: "trait"` (exact trait equality), which
// excludes the separate "X-Antibody" trait printed on cards such as BT20-073.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
            },
            count: 1,
          },
          cost: {
            kind: "payMemory",
            memory: 1,
            raw: "By paying 1 cost",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-006", compiled);
