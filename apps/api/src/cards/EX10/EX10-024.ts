import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5076/Q5077: the link card itself may pay the cost, and another link card on the same host
// may be selected too. `zone: "linked"` with `isSelfRef: true` makes the cost enumerate the
// link cards of the SOURCE's host permanent (costs.ts), which is exactly "this Digimon's link
// cards" — this card included.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isLinked: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "linked", isSelfRef: true }, count: 1 },
            raw: "By trashing 1 of this Digimon's link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 1 }],
};

registerIrCard("EX10-024", compiled);
export default compiled;
