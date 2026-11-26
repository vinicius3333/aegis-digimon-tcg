import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              effectTextPart: "Add 1 [Shishiko Sakigake]",
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Shishiko Sakigake"], match: "nameExact" }],
              },
              count: 1,
              to: "hand",
            },
            {
              effectTextPart:
                "and 1 Digimon card with [Leomon] in its name or the [Boss] trait among them to the hand.",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Leomon"], match: "name" },
                  { tokens: ["Boss"], match: "trait" },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD04-03", compiled);
