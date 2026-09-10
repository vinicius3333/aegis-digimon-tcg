import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }],
              },
              count: 1,
              to: "placeUnder",
              underFilter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
              },
            },
          ],
          rest: "deckBottom",
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Digimon",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-049", compiled);
