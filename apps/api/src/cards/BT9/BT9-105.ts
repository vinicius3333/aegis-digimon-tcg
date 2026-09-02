// HAND-FIXED IR for BT9-105 (Soul Digitalization) — do not regenerate over this file.
//
// runtime-effect fix: the generated [Main] bundle split RevealAdd(add:[]) from an unrelated
// Delete + Trash(1 card), losing "choose 1 Digimon card with [X Antibody] among them,
// delete 1 opponent Digimon whose play cost is <= the chosen card's, [then] trash the
// revealed cards" entirely (the Delete referenced an undefined chosen card, and the
// Trash only removed 1 unrelated card instead of all 3 revealed). Recomposed as
// RevealChooseDeleteBudget (reveal + choose-reference + budget-capped delete +
// return-revealed-to-trash, deleteCount:1 for "1 Digimon <= chosen cost") followed by
// the existing PlaceUnder step (KB Q1912: the just-trashed revealed cards are eligible
// placement sources).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealChooseDeleteBudget",
          revealCount: 3,
          revealController: "mine",
          chooseFilter: {
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["X Antibody"],
                match: "trait",
              },
            ],
          },
          deleteFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          deleteCount: 1,
          returnRevealed: "trash",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["X Antibody"],
                match: "trait",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-105", compiled);
