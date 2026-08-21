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
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
              digivolutionCards: "hasAny",
            },
            count: 1,
            bindAs: "thatDigimon",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                boundTo: "thatDigimon",
              },
              count: 1,
            },
            raw: "By trashing any 1 digivolution card of 1 of your Digimon with the [Mineral]/[Rock] trait",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "thatDigimon",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "Collision",
            raw: "＜Collision＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "thatDigimon",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "thatDigimon",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "thatDigimon",
            filter: {},
            count: 1,
          },
          restriction: "cannotReturnToHandOrDeck",
          byOpponentOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            fromSelectionRef: "thatDigimon",
            filter: {},
            count: 1,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX8-070", compiled);
