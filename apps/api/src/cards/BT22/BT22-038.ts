import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.1"],
                match: "trait",
              },
            ],
          },
          into: {
            cardId: "BT22-038",
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
              scaling: {
                per: 1,
                filter: {
                  controllerDefault: "mine",
                  faceDown: true,
                },
                unit: "digivolutionCards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "monzaemonTarget",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                position: "bottom",
                faceDown: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "monzaemonTarget" },
          amount: -4000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: { filter: {}, count: 1, fromSelectionRef: "monzaemonTarget" },
          timings: ["whenDigivolving"],
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "monzaemonTarget",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                position: "bottom",
                faceDown: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "monzaemonTarget" },
          amount: -4000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: { filter: {}, count: 1, fromSelectionRef: "monzaemonTarget" },
          timings: ["whenDigivolving"],
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
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
      names: ["Numemon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["DM"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-038", compiled);
