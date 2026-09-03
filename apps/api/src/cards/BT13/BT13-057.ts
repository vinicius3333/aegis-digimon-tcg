// HAND-FIXED IR for BT13-057 (Rosemon) — do not regenerate. Both suspend selections
// CanSelectPermanentCondition gates on `!permanent.IsSuspended`, and resolution guards
// on `!IsSuspended && CanSuspend`): a suspend may only target an UNSUSPENDED permanent.
// Without it the [All Turns] watcher could re-pick the already-suspended cost target as a
// no-op instead of a fresh opponent.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          abortOnDecline: true,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon", "Tamer"],
                unsuspended: true,
              },
              count: 1,
            },
            raw: "By suspending 1 of your opponent's Digimon or Tamers",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                  unsuspended: true,
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-057", compiled);
