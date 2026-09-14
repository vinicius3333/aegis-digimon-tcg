import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] You may trash up to 3 cards in your hand. If you do, for each card trashed, suspend 1 of your opponent's Digimon.",
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "mine" }, count: 3, upTo: true },
          optional: true,
          trackCount: "titamonTrashedCards",
        },
        {
          effectTextPart:
            "[When Digivolving] You may trash up to 3 cards in your hand. If you do, for each card trashed, suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: false }, count: 1 },
          scaling: { per: 1, unit: "namedCount", countSource: "titamonTrashedCards" },
          condition: {
            kind: "namedCountAtLeast",
            countSource: "titamonTrashedCards",
            count: 1,
            raw: "you trashed at least 1 card",
          },
        },
        {
          effectTextPart: "Then, for each suspended Digimon your opponent has in play, gain 1 memory.",
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "titamonTrashedCards",
            count: 1,
            raw: "you trashed at least 1 card",
          },
          scaling: {
            per: 1,
            filter: { zone: "battleArea", controller: "opponent", suspended: true, kind: ["Digimon"] },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-057", compiled);
