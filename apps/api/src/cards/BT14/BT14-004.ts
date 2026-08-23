// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT14-004 (Tanemon).
// inheritedEffectText: "[Your Turn][Once Per Turn] When one of your effects suspends a Tamer,
// this Digimon gets +2000 DP for the turn."
// The declarative effect record compiled the trigger with no gate at all — it granted +2000 DP to a mine
// Digimon/Tamer unconditionally every YourTurn tick, instead of watching for the
// whenEffectSuspends SubTrigger. Fixed to the SubTrigger action pattern (BT10-004/EX4-033):
// sourceFilter kind:["Tamer"] (only a suspended Tamer arms it) + bySourceController:"mine"
// (only YOUR effect's suspend counts, per interpreter.ts effectSuspendsGate) + self-ref
// ModifyDP target (the buff applies to THIS Digimon, not an arbitrary mine Digimon/Tamer).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: {
            kind: ["Tamer"],
          },
          bySourceController: "mine",
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
            },
          ],
          raw: "whenEffectSuspends",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-004", compiled);
