import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
          to: "deckBottom",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["HerculesKabuterimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
            raw: "this Digimon has [HerculesKabuterimon] or [X Antibody] in its digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["HerculesKabuterimon"], cost: 1, isAlternate: true }],
};

registerIrCard("BT11-058", compiled);
