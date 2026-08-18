import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT17-055 (Diaboromon).
// Fix: DeDigivolve targets ANY opponent Digimon (no cost filter).
// Restrict targets opp Digimon with playCostLte:8, restriction 'attackPlayers',
// duration: untilOpponentTurnEnd.
// The 'attackPlayers' restriction (can't attack players) maps to DefenderCondition Defender==null
// in documented behavior.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
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
          amount: 1,
          stopAtLevel: 3,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 8,
            },
            count: 1,
          },
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
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
              amount: 1,
              stopAtLevel: 3,
            },
          ],
          raw: "[All Turns] [Once Per Turn] When one of your other Digimon with [Diaboromon] in its name is played, <De-Digivolve 1> 1 of your opponent's Digimon.",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-055", compiled);
