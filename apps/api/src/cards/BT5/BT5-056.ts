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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 2000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
            raw: "＜Digi-Burst 2＞",
          },
          abortOnDecline: true,
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 2,
          raw: "＜Digi-Burst 2＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigiBurstCardDiscarded",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              restriction: "attackOrBlock",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-056", compiled);
