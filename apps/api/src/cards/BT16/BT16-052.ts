import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: you may play 1 [KoHagurumon] Token.
// The token's "[Your Turn] This Digimon can't attack" is printed on the TOKEN itself, not on this card.
// The previous IR incorrectly added a Restrict action to BT16-052's effect — removed.
// Inherited: <Blocker>
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["KoHagurumon Token"],
          count: 1,
          payCost: false,
          optional: true,
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
      names: ["Hagurumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-052", compiled);
export { compiled };
