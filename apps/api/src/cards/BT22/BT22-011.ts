// Hand-authored override: KB Q4869 — Attack is gated on the "By paying 3 cost" condition.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["Flame"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "payMemory",
            memory: 3,
            raw: "By paying 3 cost",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" }],
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Alliance",
            raw: "＜Alliance＞",
          },
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
      level: 4,
      traits: ["Flame", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-011", compiled);
