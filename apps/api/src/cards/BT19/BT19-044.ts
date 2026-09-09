import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
// Printed "Suspend 1 of your opponent's Digimon" names no unsuspended restriction, so an
// already-suspended Digimon is a legal choice: KB Q845 (ST18-10) — "Even if you specify an
// already suspended Digimon as the target for a suspending effect, it isn't considered to be
// suspended by the effect." A `suspended: false` filter here would illegally narrow the choice.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Henry Wong", "Calumon"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you have [Henry Wong]/[Calumon]",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
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

registerIrCard("BT19-044", compiled);
