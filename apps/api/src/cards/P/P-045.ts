// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Errata 2021-11-12: only OTHER same-named Digimon gain Decoy, and Decoy replaces
// deletion only when caused by an opponent's effect.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              isSameName: true,
              sameNameAs: "sourceTopCard",
            },
            count: "all",
          },
          keyword: {
            keyword: "Decoy",
            raw: "＜Decoy (Black/White)＞",
          },
          duration: "permanent",
          whileMatchesTargetFilter: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-045", compiled);
