// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The printed Blocker, Decoy (Black), and Your Turn attack restriction belong to the token,
// not to BT16-052. Register them under the synthetic token id so every PlayToken caller gets
// the same executable behavior after the token enters the battle area.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Decoy", raw: "＜Decoy (Black)＞" },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          restriction: "attack",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("TOKEN-KoHagurumon-Token", compiled);
