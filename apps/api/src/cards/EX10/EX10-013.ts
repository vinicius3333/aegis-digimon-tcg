import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5038-Q5041/Q5734: text matching includes the printed text surfaces;
// returning fewer than five fails the by-condition; Chaos Mode digivolution
// remains optional and must satisfy its printed requirements.
const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "WhenDigivolving",
      isBreeding: true,
      actions: [
        {
          kind: "MovePermanent",
          direction: "toBattle",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Lucemon: Chaos Mode"], match: "nameExact" }],
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          // CR 15-7-4 / KB Q5039-Q5040: the "By returning 5 ..." processing condition is
          // DECLINABLE even though [End of Your Turn] itself is mandatory, and paying it does
          // NOT force the digivolve. `cost.optional` offers the payment first, `abortOnDecline`
          // stops the clause when the payment is refused, and the action's own `optional` then
          // offers the Chaos Mode digivolve separately (Q5040: return 5, then decline).
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: { filter: { controller: "mine", zone: "trash", textContains: "Lucemon" }, count: 5 },
            to: "deckBottom",
            optional: true,
            raw: "By returning 5 cards with [Lucemon] in their texts from your trash to the bottom of the deck",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Cupimon"], cost: 5, level: 2, isAlternate: true }],
};

registerIrCard("EX10-013", compiled);
export default compiled;
