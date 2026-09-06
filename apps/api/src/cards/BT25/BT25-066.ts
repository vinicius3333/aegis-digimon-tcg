import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-066 Guardromon. Its leave replacement pays from this Digimon's own Link zone;
// a neighboring Digimon's link card cannot satisfy the cost.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          raw: "When this Digimon would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "linked",
              },
              count: 1,
            },
            raw: "by trashing 1 of its link cards",
          },
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
          continuous: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      colors: ["Black"],
      cost: 2,
      isAlternate: false,
    },
    {
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-066", compiled);
