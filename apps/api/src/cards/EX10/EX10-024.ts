// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5076/Q5077: the link card itself may pay the cost, and another link card on
// the same host may be selected. `sameHost` plus `hostFilter` binds the cost
// to this linked card's host, while still allowing this card itself.
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
