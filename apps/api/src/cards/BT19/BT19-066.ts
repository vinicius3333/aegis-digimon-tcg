import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play] By trashing 1 [Composite]/[Wicked God] trait card in hand, ＜Draw 2＞.
// [Digivolve][Pagumon]: Cost 0 — a BRACKETED card name, so the alternate route's source gate
// is `namesExact`; the substring `names` form would also accept any future "…Pagumon…" card.
// Inherited: ＜Blocker＞.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Composite", "Wicked God"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Composite]/[Wicked God] trait in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Pagumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-066", compiled);
