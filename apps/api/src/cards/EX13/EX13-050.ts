import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictMemoryGain",
          seat: "any",
          exceptTamerEffects: true,
          duration: "permanent",
          raw: "Players can't gain memory other than by Tamer effects",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-050", compiled);
