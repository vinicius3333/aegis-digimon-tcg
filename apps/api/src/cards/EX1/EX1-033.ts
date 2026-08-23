// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
          mode: "reduceCost",
          amount: 1,
          consumeOnActivate: true,
          into: { nameOrTrait: [{ tokens: ["Insectoid", "Ancient Insect"], match: "trait" }] },
          raw: "reduce the memory cost of the next matching digivolution by 1",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-033", compiled);
