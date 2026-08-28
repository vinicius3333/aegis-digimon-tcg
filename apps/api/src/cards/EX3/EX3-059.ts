import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-verified IR for EX3-059 (DarkTyrannomon).
// Its inherited On Deletion must select a Digimon that can actually transition to
// suspended; already-suspended permanents are not legal targets for "Suspend 1".
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-059", compiled);
