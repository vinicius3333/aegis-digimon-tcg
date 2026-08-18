import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * BT3-109 — Back for Revenge!
 *
 * The timed watcher follows the chosen permanent. At its pre-deletion event it
 * grants the replay token to the permanent's then-current top card; therefore a
 * later digivolution replays the evolved card while its sources remain in trash
 * (Q1147/Q2730/Q2761). The library token suppresses that replay's On Play window.
 */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "onDeletionOf",
          gainedActions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "effects",
              tokens: ["OnDeletionPlaySelfNoOnPlay"],
              duration: "forTheTurn",
            },
          ],
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-109", compiled);
export default compiled;
