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
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
            controller: "mine",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "MindLink",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              trait: ["X Antibody", "SoC"],
            },
            count: 1,
            upTo: false,
          },
        },
      ],
      keywords: [
        {
          keyword: "Mind Link",
          raw: "＜Mind Link＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Piercing",
              raw: "＜Piercing＞",
            },
          },
          while: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["X Antibody"], match: "trait" },
                { tokens: ["SoC"], match: "trait" },
              ],
            },
            raw: "this Digimon has the [X Antibody] or [SoC] trait",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["X Antibody"], match: "trait" },
                { tokens: ["SoC"], match: "trait" },
              ],
            },
            raw: "this Digimon has the [X Antibody] or [SoC] trait",
          },
        },
      ],
      isInherited: true,
    },
    {
      trigger: "EndOfAllTurns",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Kosuke Kisakata"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-087", compiled);
export { compiled };
