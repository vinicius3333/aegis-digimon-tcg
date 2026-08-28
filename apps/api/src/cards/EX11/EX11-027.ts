// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "name" }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "Link",
          target: {
            filter: { isSelfRef: true },
            orFilters: [{ controller: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "name" }] }],
            count: 1,
          },
          recipient: {
            filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, texts: ["Maquinamon"], cost: 0, isAlternate: true }],
};

registerIrCard("EX11-027", compiled);
export default compiled;
