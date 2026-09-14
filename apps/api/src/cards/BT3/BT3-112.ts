import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  cardId: "BT3-112",
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] Trigger ＜De-Digivolve 1＞ on all of your opponent's Digimon. (Trash a card from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards.)",
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          amount: 1,
        },
        {
          effectTextPart: "Then, delete all of your opponent's Digimon with 5000 DP or less.",
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "cantBeBlocked",
          duration: "forTheTurn",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                kind: ["Digimon"],
                levels: [6],
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            raw: "by returning one of its level 6 digivolution cards to your hand",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-112", compiled);
export default compiled;
