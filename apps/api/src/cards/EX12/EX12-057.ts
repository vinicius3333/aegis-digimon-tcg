// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            {
              name: "Paishu",
              color: "Yellow",
              dp: 6000,
              keywords: [{ keyword: "Blocker" }, { keyword: "Guard" }],
            },
          ],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            {
              name: "Paishu",
              color: "Yellow",
              dp: 6000,
              keywords: [{ keyword: "Blocker" }, { keyword: "Guard" }],
            },
          ],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "Counter",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            {
              name: "Paishu",
              color: "Yellow",
              dp: 6000,
              keywords: [{ keyword: "Blocker" }, { keyword: "Guard" }],
            },
          ],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
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
              amount: 2,
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -6000,
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
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-057", compiled);
