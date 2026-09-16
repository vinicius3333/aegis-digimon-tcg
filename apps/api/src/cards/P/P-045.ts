import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
