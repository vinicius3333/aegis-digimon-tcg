import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
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
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
            },
            raw: "By trashing 1 card in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["SoC"],
                  match: "trait",
                },
              ],
            },
            raw: "a Tamer card with the [SoC] trait is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
            },
            raw: "By trashing 1 card in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["SoC"],
                  match: "trait",
                },
              ],
            },
            raw: "a Tamer card with the [SoC] trait is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "memoryAtLeast",
            controller: "opponent",
            value: 1,
            raw: "your opponent has 1 or more memory",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-075", compiled);
export { compiled };
