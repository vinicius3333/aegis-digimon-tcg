import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          effectTextPart:
            "[Main] Reveal the top 2 cards of your deck. Add 1 yellow card among them to your hand. Place the rest at the bottom of your deck in any order.",
          revealCount: 2,
          add: [
            {
              filter: {
                controllerDefault: "mine",
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
          effectTextPart: "Then, place this card into your battle area.",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Yellow"],
            zone: "hand",
          },
          from: ["hand"],
          payCost: true,
          costDelta: -2,
          optional: true,
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-105", compiled);
