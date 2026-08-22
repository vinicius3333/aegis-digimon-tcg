// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5076/Q5077: the link card itself may pay the cost, and another link card on
// the same host may be selected. The current IR cost selector can see owned
// link cards but cannot bind the selection to this link card's host; that
// limitation remains explicit in residual below.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isLinked: true,
      actions: [{
        kind: "DeDigivolve",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: 1,
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "digivolutionCardsOrLinkCards" }, count: 1 },
          raw: "By trashing 1 of this Digimon's link cards",
        },
      }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "partial",
  residual: ["IR cannot yet bind the link-card trash cost to this link card's host; current selector may see another owned Digimon's link card."],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 1 }],
};

registerIrCard("EX10-024", compiled);
export default compiled;
