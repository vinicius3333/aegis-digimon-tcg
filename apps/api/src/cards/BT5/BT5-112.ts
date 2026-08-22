import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT5-112 (Omnimon Zwart Defeat). The AUTO-GENERATED
// runtime record IR was wrong on two clauses, so the generator header is intentionally
// header). Behavior is executed by the shared interpreter; this file only carries
// the corrected IR and registers it.
//
// Oracle text (cards.json, matches the three printed clauses; KB reports no errata,
// Q&A only):
//   [Security] Play this card without battling and without paying its memory cost.
//   [When Digivolving] Delete 1 of your opponent's Tamers.
//   [On Deletion] Delete 1 of your opponent's Digimon.
//
// Corrections vs the runtime record IR, grounded in the binding KB rulings:
//   - Security clause: the runtime record emitted an EMPTY target filter ({}), which the
//     interpreter's PlayWithoutCost handler treats as a FILTERED play from the hand
//     (DEFAULT_PLAY_ZONES) rather than "play THIS card". Replaced with the canonical
//     self-target shape ({ isSelf: true, filter: { isSelfRef: true } }) so the handler
//     takes the self branch -> ctx.fx.playFromSecurity(self, { payCost: false }). The
//     card is placed without paying cost and without entering combat — "without
//     battling" (Q1395) is satisfied because this path never invokes a battle; the
//     remaining security checks after it resolves are the engine's (Q1396).
//   - When Digivolving: the runtime record emitted controller "mine" and kind
//     ["Tamer","Digimon"]. The text deletes 1 of the OPPONENT'S TAMERS only. Per Q1397
//     this may NOT delete a Digimon that digivolved from a Tamer, so the target must be
//     an actual Tamer permanent (a Digimon stacked on a Tamer is kind Digimon and is
//     excluded by kind ["Tamer"]). Fixed to { controller: "opponent", kind: ["Tamer"] }.
//   - On Deletion: already correct (delete 1 of the opponent's Digimon); kept as-is.
//
// The runtime record's empty "without battling" Static block (the source
// rule implementation, which has no IR action) is dropped: it would only
// register a no-op staticModifier, and the no-battle semantics are already implicit in
// the Security play path above.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          from: ["security"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-112", compiled);
