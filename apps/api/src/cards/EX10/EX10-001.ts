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
          event: "whenLinkTrashed",
          // "any of THIS Digimon's link cards": the whenLinkTrashed bus broadcasts every
          // link-card trash on either side, so the watcher must bind the payload host to the
          // permanent carrying this inherited effect (same shape as EX10-030 / EX10-073).
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
          raw: "[Your Turn] [Once Per Turn] When effects trash any of this Digimon's link cards, gain 1 memory.",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX10-001", compiled);
