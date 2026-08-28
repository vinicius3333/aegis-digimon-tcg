// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it.
// Audit fixes (LM audit):
//   - "None of your opponent's Tamers can unsuspend" is a standing rule over that player's
//     Tamers, so it installs as a live seat-scoped filter rather than a snapshot of the
//     Tamers present when it resolved
//   - "For each suspended Tamer" carries no possessive, so it counts BOTH players' suspended
//     Tamers — which is the whole point of suspending one and locking the opponent's
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Tamer"],
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
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
          amount: 1000,
          duration: "permanent",
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "any",
              suspended: true,
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-010", compiled);
