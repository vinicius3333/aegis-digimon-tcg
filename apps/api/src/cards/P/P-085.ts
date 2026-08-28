// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4178: this effect never ignores the chosen trash card's digivolution requirements.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: true,
          optional: true,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "isYourTurn" },
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                  colors: ["Purple"],
                },
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-085", compiled);
