import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mother: Filter = {
  controller: "mine",
  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
  excludeCardsNamed: ["ADR-01 Jeri"],
};
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -1000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }] },
            unit: "digivolutionCardsOfFiltered",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: mother,
          targetIsPermanent: true,
          position: "bottom",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["ADR-01 Jeri"], match: "name" }],
                },
                count: 1,
              },
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
              bindResultAs: "playedJeri",
            },
            { kind: "RedirectAttack", target: { filter: { boundRef: "playedJeri" }, count: 1 }, optional: true },
          ],
          raw: "when any of your opponent's Digimon attack",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-078", compiled);
