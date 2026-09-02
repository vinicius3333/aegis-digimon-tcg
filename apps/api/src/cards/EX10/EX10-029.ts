import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX10-029.
// Fix: SubTrigger whenLinked was missing its Restrict after SelectBind.
// (documented behavior). Fixed by adding Restrict{cantBeDeDigivolved, untilOpponentTurnEnd}
// on the bound target after SelectBind.
// Added cantBeDeDigivolved to RestrictionKind (ir.ts) + Restriction (EffectContext.ts)
// and a guard in primitives.ts deDigivolve.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
    },
    {
      trigger: "Static",
      keywords: [],
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true },
              count: 1,
            },
            raw: "By trashing 1 of this Digimon's link cards",
          },
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
                bindAs: "A",
              },
            },
            {
              kind: "Restrict",
              target: {
                filter: {},
                count: 1,
                fromSelectionRef: "A",
              },
              restriction: "cantBeDeDigivolved",
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "[When Linking] By trashing 1 of this Digimon's link cards, <De-Digivolve> effects don't affect 1 of your Digimon until your opponent's turn ends.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // No `digivolutionRequirement`: Warpmon prints no [Digivolve] line. Its only evolution route
  // is the catalog evoCost (Black, level 3, cost 2). The record previously carried an invented
  // alternate `{ cost: 2, traits: ["StandardApp"] }` — "StandardApp" is not a trait any card in
  // the catalog has (the card's FORMS are "Sup."/"Appmon"), so it granted a cost-2 route with no
  // level or color gate that only failed to fire because its trait matched nothing.
  linkRequirement: [
    {
      cost: 2,
      traits: ["Appmon"],
    },
  ],
};

export { compiled };

registerIrCard("EX10-029", compiled);
