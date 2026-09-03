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
            count: 1,
          },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 1,
            },
            raw: "＜Digi-Burst 1＞",
          },
          abortOnDecline: true,
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 1,
          raw: "＜Digi-Burst 1＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "true" },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-072", compiled);
