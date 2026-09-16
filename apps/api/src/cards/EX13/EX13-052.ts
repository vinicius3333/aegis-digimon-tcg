import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };

const deDigivolveOne = (): Action[] => [
  {
    kind: "DeDigivolve",
    target: { filter: opponentDigimon, count: 1 },
    amount: 1,
    raw: "＜De-Digivolve 1＞ 1 of your opponent's Digimon",
  },
];

export const compiled: CompiledCard = {
  cardId: "EX13-052",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    },
    {
      trigger: "OnPlay",
      actions: deDigivolveOne(),
    },
    {
      trigger: "OnDeletion",
      actions: deDigivolveOne(),
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
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
              },
              count: 1,
            },
            raw: "by deleting 1 of your other Digimon with [Knightmon] in its text",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-052", compiled);
