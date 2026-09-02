import type { CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playEffects: CardEffect[] = (["OnPlay", "WhenDigivolving"] as const).map((trigger): CardEffect => ({
  trigger,
  actions: [
    { kind: "TrashTopDeck", controller: "mine", amount: 2 },
    {
      kind: "GainKeyword",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      duration: "untilOpponentTurnEnd",
    },
  ],
}));

const compiled: CompiledCard = {
  effects: [
    ...playEffects,
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
                count: 1,
              },
            },
          ],
          raw: "when effects trash cards from your deck",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-071", compiled);
