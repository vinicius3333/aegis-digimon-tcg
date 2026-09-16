import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sukamonOrEtemonNamed: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Sukamon", "Etemon"], match: "name" }],
};

const revealAddAndTrash = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    { filter: sukamonOrEtemonNamed, count: 1, to: "hand" },
    { filter: sukamonOrEtemonNamed, count: 1, to: "trash", requiresMinRevealed: 2 },
  ],
  rest: "deckBottom",
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [revealAddAndTrash()],
    },
    {
      trigger: "OnPlay",
      actions: [revealAddAndTrash()],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "any",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
              },
              count: 1,
            },
            raw: "by deleting 1 other Digimon with [Sukamon] in its name",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-027", compiled);
