import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The 50-copy rule is represented by the catalog's maxCountInDeck: 50. The remaining printed
// clauses are registered as executable IR so the interpreter does not fall back to residual data.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce its play cost by 2 if you don't have another [ADR-02 Searcher] in play",
              condition: {
                kind: "youHaveNone",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }],
                },
                raw: "you don't have another [ADR-02 Searcher] in play",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "attackPlayers",
          duration: "permanent",
        },
      ],
    },
    { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }] },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-046", compiled);
