// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text: When this card would be played or digivolved into, if you have a Digimon with 3 or more
// digivolution cards and the [Night Claw]/[Light Fang]/[Galaxy] trait, reduce the play or
// digivolution cost by 2.
// KB Q3569: the cost reduction activates when this card would be played/digivolved-into (as a
// target), NOT when digivolving FROM this card. Current IR only had 'wouldBePlayed'; the event
// must also cover 'wouldBeDigivolvedInto'.
// The condition requires BOTH: 3+ digivolution cards AND the specific trait.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Night Claw", "Light Fang", "Galaxy"],
                      match: "trait",
                    },
                  ],
                  digivolutionCardsAtLeast: 3,
                },
                raw: "you have a Digimon with 3 or more digivolution cards and the [Night Claw]/[Light Fang]/[Galaxy] trait",
              },
            },
          ],
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 2,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Night Claw", "Light Fang", "Galaxy"],
                      match: "trait",
                    },
                  ],
                  digivolutionCardsAtLeast: 3,
                },
                raw: "you have a Digimon with 3 or more digivolution cards and the [Night Claw]/[Light Fang]/[Galaxy] trait",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
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
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-020", compiled);
