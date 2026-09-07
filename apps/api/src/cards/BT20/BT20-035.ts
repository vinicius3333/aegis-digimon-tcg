import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: Suspend 1 of opponent's Digimon OR Tamers. Then, 1 of their
// Digimon OR Tamers can't unsuspend until end of their turn (may be different cards).
// KB Q4343 confirms suspend target and can't-unsuspend target can differ.
// [All Turns]: When Tamer cards are placed in this Digimon's digivolution cards, activate
// 1 of this Digimon's [When Digivolving] effects. Then, 1 of your Digimon may attack an opponent Digimon.
// The ActivateEffect targets the opponent's Digimon or Tamer (inherited from WhenDigivolving).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            controllerDefault: "mine",
          },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            {
              kind: "ActivateEffect",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              effectType: "WhenDigivolving",
            },
            {
              kind: "Attack",
              attackPlayer: false,
              target: {
                filter: { controller: "mine", kind: ["Digimon"] },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "selfHasNameContaining",
                names: ["Fenriloogamon"],
                raw: "this Digimon has [Fenriloogamon] in its name",
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Pulsemon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 5,
      traits: ["SEEKERS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-035", compiled);
