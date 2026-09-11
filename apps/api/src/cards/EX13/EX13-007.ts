import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "1 Digimon card with [Gallantmon] in its name or 1 red Tamer card" is a union across two
// different kinds, so the Tamer branch lives in `filter.orFilters` rather than widening
// `kind`: a red Digimon must not qualify and a Gallantmon-named Tamer does not exist.
// "with [Gallantmon] in its name" is the substring reading (match: "name"), so
// ChaosGallantmon qualifies; a bracketed bare [Name] would have needed "nameExact".
//
// The inherited clause carries no condition — unlike BT19-007's "while you have 0 or less
// memory" twin, EX13-007's +2000 applies on every turn. Comprehensive rules 15-15-4-1
// ("an effect that adds to the numerical value of an effect adds to the value shown in
// text") is why DeletionMaxDpModifier only raises printed numeric maximums.
const returnFromTrash = (): Action => ({
  kind: "Return",
  target: {
    filter: {
      zone: "trash",
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [
        {
          tokens: ["Gallantmon"],
          match: "name",
        },
      ],
      orFilters: [
        {
          zone: "trash",
          controller: "mine",
          kind: ["Tamer"],
          colors: ["Red"],
        },
      ],
    },
    count: 1,
  },
  to: "hand",
  cost: {
    kind: "trash",
    target: {
      filter: {
        zone: "hand",
        controller: "mine",
      },
      count: 1,
    },
    raw: "By trashing 1 card in your hand",
  },
  optional: true,
  abortOnDecline: true,
});

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [returnFromTrash()],
    },
    {
      trigger: "OnPlay",
      actions: [returnFromTrash()],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-007", compiled);
