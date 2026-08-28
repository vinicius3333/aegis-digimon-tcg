// @ts-nocheck
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Ruli Tsukiyono"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Ruli Tsukiyono"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have [Ruli Tsukiyono]",
          },
          optional: true,
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
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "opponentHasNone",
            filter: {
              controllerDefault: "opponent",
              unsuspended: true,
              kind: ["Digimon"],
            },
            raw: "your opponent has no unsuspended Digimon",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-022", compiled);
