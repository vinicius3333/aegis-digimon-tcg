import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            // Printed: "DNA digivolve into [Shakkoumon] IN THE HAND". The zone lives on the
            // result filter; the previous top-level `from: ["hand"]` is not a field of
            // DnaDigivolveAction and was silently ignored (it only agreed with the default).
            zone: "hand",
            nameOrTrait: [
              {
                tokens: ["Shakkoumon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            // Printed: "DNA digivolve into [Shakkoumon] IN THE HAND". The zone lives on the
            // result filter; the previous top-level `from: ["hand"]` is not a field of
            // DnaDigivolveAction and was silently ignored (it only agreed with the default).
            zone: "hand",
            nameOrTrait: [
              {
                tokens: ["Shakkoumon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["CS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-027", compiled);
