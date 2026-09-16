import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart: "[When Digivolving] Suspend 1 of your opponent's Digimon or Tamers.",
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
              effectTextPart: "Then, 1 of your Digimon may attack your opponent's Digimon.",
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
