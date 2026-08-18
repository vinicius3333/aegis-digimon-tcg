import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text: [Main] <De-Digivolve 1> 1 of your opponent's Digimon. (Trash 1 card from the top of
// 1 of your opponent's Digimon. Stop trashing when you would trash a level 3 card or the
// Digimon's last card.) Then, delete 1 of your opponent's Digimon with a play cost of 5 or less.
// The Trash action in the old IR was wrong: De-Digivolve 1 is a single keyword action (not
// a separate Trash targeting a level-3 Digimon). The stop-at-level-3 behavior is intrinsic
// to the DeDigivolve keyword.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 5,
            },
            count: 1,
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

registerIrCard("EX3-071", compiled);
