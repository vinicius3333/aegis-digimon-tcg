import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              effectTextPart:
                "[All Turns] [Once Per Turn] When any of your Digimon are played, ＜De-Digivolve 2＞ 1 of your opponent's Digimon.",
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
              effectTextPart: "Then, 1 of their Digimon gets -6000 DP until their turn ends.",
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
