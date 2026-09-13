import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const budgetDelete: Action = {
  kind: "DeleteBudget",
  filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
  budget: 3,
  upTo: true,
  scaling: {
    per: 1,
    filter: {
      nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
    },
    unit: "digivolutionCards",
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
                    nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
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
