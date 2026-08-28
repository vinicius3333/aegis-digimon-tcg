// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "digivolveHost",
          },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              from: ["hand"],
            },
            host: "target",
            underFilter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              orFilters: [
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levels: [4],
                },
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  traits: ["Legend-Arms"],
                },
              ],
            },
            position: "bottom",
            bindHostAs: "digivolveHost",
            raw: "By placing this card as the bottom digivolution card of 1 of your Digimon that's level 4 or has the [Legend-Arms] trait",
          },
          additionalCost: {
            kind: "payMemory",
            memory: 1,
            raw: "By paying 1 cost",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
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
                keyword: "Blocker",
                raw: "＜Blocker＞",
              },
              duration: "untilOpponentTurnEnd",
            },
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
                keyword: "Reboot",
                raw: "＜Reboot＞",
              },
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "onAddDigivolutionCards",
        },
      ],
      frequency: "OncePerTurn",
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
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Legend-Arms"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX6-040", compiled);
