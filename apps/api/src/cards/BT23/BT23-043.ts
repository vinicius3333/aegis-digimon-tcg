// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "permanent",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "flipSecurity",
                target: {
                  filter: {
                    zone: "security",
                    controller: "mine",
                    position: "top",
                    faceUp: true,
                  },
                  count: 1,
                },
                raw: "by flipping your top face-up security card face down",
              },
              optional: true,
              abortOnDecline: true,
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
      level: 4,
      traits: ["Royal Base", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-043", compiled);
