// @ts-nocheck
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
          keyword: "Overclock",
          qualifier: "Puppet",
          raw: "＜Overclock ([Puppet] trait)＞",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          attackPlayer: true,
          withoutSuspending: true,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kindOrToken: ["Digimon", "Token"],
                nameOrTrait: [
                  {
                    tokens: ["Puppet"],
                    match: "trait",
                  },
                ],
                allowTokens: true,
              },
              count: 1,
            },
            raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon",
          },
        },
      ],
      keywords: [
        {
          keyword: "Overclock",
          qualifier: "Puppet",
          raw: "＜Overclock ([Puppet] trait)＞",
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar"],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar"],
          count: 1,
          payCost: false,
          optional: true,
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -6000,
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-030", compiled);
