// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q1803-Q1805: the two trashed sources share a level with each other, this
// card may be one of them, and only effect-driven deletion or hand/deck return
// can be prevented. The source anchor keeps this inherited replacement local
// to the Digimon carrying Greymon X; the name condition then evaluates that
// source's current name.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byEffect",
          optional: true,
          sourceFilter: { isSelfRef: true },
          condition: {
            kind: "selfHasNameContaining",
            names: ["Greymon", "Omnimon"],
            raw: "this Digimon has [Greymon] or [Omnimon] in its name",
          },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
            raw: "trash 2 cards of the same level in this Digimon's digivolution cards",
          },
          raw: "prevent this Digimon from leaving play",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Greymon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT9-012", compiled);
