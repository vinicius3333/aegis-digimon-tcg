import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1305: returning a Digimon to hand does not count as trashing digivolution cards.
// KB Q1306: even if digivolution cards of 2 opponent Digimon are trashed simultaneously,
// only 1 memory is gained per turn. Encoded via once:true on the SubTrigger so the
// installed watcher fires at most once, plus OncePerTurn on the outer trigger to
// prevent re-installation. Engine must honor once:true on subscribeSubTrigger
// (see LANE_G.md CAP-G5).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          once: true,
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "triggerByYourEffect" },
            },
          ],
          raw: "[Your Turn][Once Per Turn] When you trash a digivolution card of 1 of your opponent's Digimon, gain 1 memory",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-022", compiled);
