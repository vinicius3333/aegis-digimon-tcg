import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX3-019 (Paledramon).
// runtime-effect fixes:
// - [When Digivolving] restricts the host choice to Digimon with sources, then lets the
//   controller choose any one card from that host's stack.
// - [Opponent's Turn] Inherited Replacement: corrected mode from "reduceCost" / amount -1 to
//   "increaseCost" / amount 1 — the text says "increase the digivolution cost by 1".
// - Source filter: Digimon with no digivolution cards (digivolutionCards: "none") is preserved per text.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          raw: "when an opponent's Digimon with no digivolution cards would digivolve",
          sourceFilter: {
            digivolutionCards: "none",
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "increaseCost",
              amount: 1,
              raw: "increase the digivolution cost by 1",
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-019", compiled);
