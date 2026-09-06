// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              differentColors: true,
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
            from: ["hand", "trash"],
          },
          underFilter: {
            isSelfRef: true,
          },
          optional: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "ifThisEffectActed", raw: "this effect placed" },
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            count: 4,
            filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
            raw: "if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              differentColors: true,
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
            from: ["hand", "trash"],
          },
          underFilter: {
            isSelfRef: true,
          },
          optional: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "ifThisEffectActed", raw: "this effect placed" },
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            count: 4,
            filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
            raw: "if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [
                {
                  tokens: ["Hybrid", "Ten Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheAttack",
          cost: {
            kind: "attack",
            raw: "by attacking with this Digimon",
          },
          optional: true,
          condition: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }],
            },
            raw: "this Digimon has the [Hybrid] or [Ten Warriors] trait",
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

registerIrCard("AD1-020", compiled);
