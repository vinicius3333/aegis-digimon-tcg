import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT21-056 (GranKuwagamon).
// Fix: Return target must EXCLUDE DigiEgg (not include it).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon", "Option", "Tamer"],
              zone: "trash",
              nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }],
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }],
              },
              count: 1,
            },
            raw: "By trashing 1 card with [Vemmon] in its text from your hand",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          raw: "When this Digimon would digivolve into a Digimon card with [Vemmon] in its text, reduce the digivolution cost by 1",
          condition: {
            kind: "raw",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }],
            },
            raw: "digivolve into a Digimon card with [Vemmon] in its text",
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

registerIrCard("BT21-056", compiled);
