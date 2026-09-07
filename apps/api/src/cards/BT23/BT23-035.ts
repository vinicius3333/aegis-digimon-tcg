import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-035 Dynasmon
// Fix: [All Turns] Recovery action was outside the SubTrigger and had spurious `source` field.
//   The conditional Recovery action is moved inside the SubTrigger as a second action.
// Fix (re-audit): ＜Recovery +1 (Deck)＞ takes the deck's TOP card by rule (§16-6), so it uses
//   the `addTop` / `source: "deck"` shape shared with EX1-027, which prints the same clause.
//   The previous `placeAsSecurity` + `source` target filter opened a card selection over the
//   whole deck, letting the controller pick any deck card.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -6000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -6000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "mine",
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: 1,
                raw: "＜Security Attack +1＞",
              },
              duration: "untilYourTurnEnd",
            },
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
            },
          ],
          raw: "When your security stack is removed from",
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
      traits: ["Witchelny", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-035", compiled);
