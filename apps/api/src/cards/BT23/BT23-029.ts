// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-029 (Antylamon).
// [All Turns] [Once Per Turn] When any of your cards with [Beast], [Beastkin] or [CS]
// trait are played, 1 of your opponent's Digimon can't activate [When Digivolving] effects
// until the end of your opponent's turn.
// KB Q5265: also triggers when this card itself is played.
// KB Q5266-Q5270: restriction prevents all [When Digivolving] activations (direct & via effects).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Beast", "Beastkin", "CS"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "When any of your cards with the [Beast], [Beastkin] or [CS] trait are played, until your opponent's turn ends, 1 of their Digimon can't activate [When Digivolving] effects",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Turuiemon", "Wendigomon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-029", compiled);
