// Hand override (was auto-generated): the IR compiler mis-modeled the [On Play]/[When
// Digivolving] clause as a plain Trash of an opponent Digimon's TOP card. The card
// (SkullSeadramon, documented behavior) trashes up to 3 *digivolution cards* from one opponent
// Digimon (a source trash, not a deletion), and only then — if it was PLAYED BY AN EFFECT —
// deletes 1 opponent Digimon with no digivolution cards.
import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Trash up to 3 digivolution cards from a single opponent Digimon that has at least one.
const trashThreeSources: Action = {
  kind: "TrashDigivolution",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
    count: 1,
  },
  amount: 3,
};

export const compiled: CompiledCard = {
  effects: [
    {
      // INSIDE the shared coroutine (documented behavior), so it runs only on [On Play] by an
      // effect — never on a digivolve. triggerEnteredByEffect carries the "by an effect" gate.
      trigger: "OnPlay",
      actions: [
        trashThreeSources,
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
            count: 1,
          },
          condition: { kind: "triggerEnteredByEffect" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [trashThreeSources],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [
                { tokens: ["Seadramon"], match: "name" },
                { tokens: ["TS"], match: "trait" },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "place",
            target: {
              filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
              count: 1,
            },
            raw: "By placing 1 of your other Digimon as this Digimon's bottom digivolution card",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Aqua"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["Sea Animal"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
    {
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
};

registerIrCard("BT24-074", compiled);
