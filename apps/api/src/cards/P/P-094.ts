// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const budgetDelete = {
  kind: "Delete" as const,
  target: {
    filter: { controller: "opponent" as const, kind: ["Digimon", "Tamer"] as const },
    count: "all" as const,
    upTo: true,
    totalPlayCostBudget: 3,
  },
  scaling: {
    per: 1,
    filter: {
      nameOrTrait: [{ tokens: ["Vemmon"], match: "name" as const }],
    },
    unit: "digivolutionCards" as const,
    budgetAdd: 1,
  },
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [budgetDelete] },
    { trigger: "WhenDigivolving", actions: [budgetDelete] },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              cost: {
                kind: "return",
                to: "deckBottom",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controller: "mine",
                    sameHost: true,
                    nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
                    hostFilter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Galacticmon"], match: "nameExact" }],
                    },
                  },
                  count: 2,
                },
                raw: "by returning 2 Vemmon from 1 Galacticmon's digivolution cards to deck bottoms",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-094", compiled);
