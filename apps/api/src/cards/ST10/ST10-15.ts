// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
            },
            raw: "you have a yellow Digimon in play",
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

registerIrCard("ST10-15", compiled);
