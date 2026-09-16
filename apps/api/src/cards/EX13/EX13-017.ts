import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const revealAdd = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        nameOrTrait: [
          { tokens: ["Veedramon"], match: "text" },
          { tokens: ["Royal Knight"], match: "trait", orPrevious: true },
        ],
      },
      count: 1,
      to: "hand",
    },
  ],
  rest: "deckBottom",
});

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenMoving", actions: [revealAdd()] },
    { trigger: "OnPlay", actions: [revealAdd()] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending it",
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
  digivolutionRequirement: [{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-017", compiled);
