// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["D-Brigade"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {},
                count: 1,
                sourceRef: "triggerSubject",
              },
              keyword: {
                keyword: "Rush",
                raw: "＜Rush＞",
              },
              duration: "forTheTurn",
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

registerIrCard("EX3-049", compiled);
