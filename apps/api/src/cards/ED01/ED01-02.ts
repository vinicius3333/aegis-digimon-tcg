import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Trash all digivolution cards of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          amount: "all",
        },
        {
          effectTextPart: "Then, 1 of their Digimon can't attack until their turn ends.",
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Valner Dragnogh"], match: "nameExact" }],
                },
                raw: "you have [Valner Dragnogh]",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ED01-02", compiled);
