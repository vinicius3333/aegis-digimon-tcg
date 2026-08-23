// @ts-nocheck
// HAND-AUTHORED OVERRIDE: the inherited aura evaluates the current host's name and traits.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Sistermon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
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
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              isSelfRef: true,
              nameOrTrait: [
                { tokens: ["Huckmon"], match: "name" },
                { tokens: ["Royal Knight"], match: "trait" },
              ],
            },
            raw: "this Digimon has [Huckmon] in its name or [Royal Knight] in its traits",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST12-04", compiled);
