// Hand-authored override for EX3-006.
// Hand-authored runtime fix: encode the printed trait gate structurally instead of as
// a raw string. Per KB Q3371 [Dragonkin] is also included alongside [Dragon], [saur],
// and [Ceratopsian].
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["Dragon"], match: "traitContains" },
                { tokens: ["saur"], match: "traitContains" },
                { tokens: ["Ceratopsian"], match: "traitContains" },
                { tokens: ["Dragonkin"], match: "trait" },
              ],
            },
            raw: "this Digimon has [Dragon], [saur], [Ceratopsian], or [Dragonkin] in one of its traits",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-006", compiled);
