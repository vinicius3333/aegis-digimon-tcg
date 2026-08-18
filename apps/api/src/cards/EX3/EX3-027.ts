// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX3-027. The two event listeners share this effect's
// [Once Per Turn] key through the interpreter's frequency binding.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Four Great Dragons"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOptionPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Trial of the Four Great Dragons"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-027", compiled);
