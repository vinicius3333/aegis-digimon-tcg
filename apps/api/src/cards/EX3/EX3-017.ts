import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored runtime fix: Q3385 binds "that Digimon" to the selected blue target, with the
// entry-zone receipt gating the source-only unsuspend.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            count: 1,
            bindAs: "blocker",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "blocker",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Unsuspend",
          target: {
            fromSelectionRef: "blocker",
            filter: {},
            count: 1,
          },
          condition: {
            kind: "playedFromZone",
            zone: "digivolutionCards",
            raw: "when played from digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-017", compiled);
