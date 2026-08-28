// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q4153: having this card in battle area doesn't fulfill color requirements.
// Q4154: can activate <Delay> effect while this card is in battle area even without other yellows.
// Intrinsic Delay already trashes the source as its activation cost.
// 1st [Main]: RevealAdd top 4, add 1 yellow Digimon to hand, place rest at bottom, then place this card in battle area.
// 2nd [Main] <Delay>: trash this card from battle area (cost) to gain 2 memory.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Yellow"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-037", compiled);
