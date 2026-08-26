// @ts-nocheck
import { registerIrCard } from "../../engine/effects/interpreter.js";

const lucemonInStack = {
  kind: "selfDigivolutionStackMatchesFilter",
  filter: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
  raw: "a [Lucemon] card is in this Digimon's digivolution cards",
};
const compiled = {
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          condition: lucemonInStack,
          cost: { kind: "trashBothSecurityTop", raw: "by trashing both players' top security cards" },
          raw: "when this Digimon would leave the battle area, by trashing both players' top security cards, it doesn't leave",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          optionalFor: "opponent",
          amount: 1,
          bindResultAs: "opponentSecurityTrashed",
        },
        {
          kind: "Recover",
          amount: 1,
          condition: { kind: "bindingEmpty", ref: "opponentSecurityTrashed", raw: "if this effect didn't trash" },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          condition: { kind: "bindingEmpty", ref: "opponentSecurityTrashed" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      levelMin: 5,
      names: ["Lucemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-043", compiled);
