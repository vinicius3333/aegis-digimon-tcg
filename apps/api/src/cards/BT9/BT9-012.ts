// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-012 (Greymon X Antibody).
// Inherited effect: when this Digimon has [Greymon] or [Omnimon] in its name
// and an effect would delete it or return it to hand/deck, you may trash 2
// same-level digivolution cards to prevent it from leaving play.
// KB Q1803-Q1805: the two cards share a level with each other, the source
// itself may be paid, and only effect-driven deletion/hand/deck return qualify.
const compiled: CompiledCard = {
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
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }],
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                isSelfRef: true,
                sameLevelPair: true,
              },
              count: 2,
              from: ["digivolutionCards"],
            },
            raw: "by trashing 2 cards of the same level in this Digimon's digivolution cards",
          },
          raw: "you may trash 2 cards of the same level to prevent this Digimon from leaving play",
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
