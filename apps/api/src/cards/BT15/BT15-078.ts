// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            zone: "battleArea",
            byEffect: true,
          },
          actions: [
            {
              kind: "GrantAuraToOpponents",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: "all",
              },
              event: "onDeletionOf",
              actions: [
                {
                  kind: "GainMemory",
                  amount: -1,
                },
              ],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              zone: "trash",
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          suspended: true,
          suppressOnPlayEffects: true,
          bindResultAs: "playedDigimon",
        },
        {
          kind: "RedirectAttack",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              boundRef: "playedDigimon",
            },
            count: 1,
          },
          optional: true,
          condition: {
            kind: "bindingExists",
            ref: "playedDigimon",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Piercing",
          raw:
            "(When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would).",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-078", compiled);
export { compiled };
