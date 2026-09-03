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
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "restriction",
            restriction: "cantAttackDigimon",
          },
          while: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [
                {
                  tokens: ["Myotismon"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have a Digimon with [Myotismon] in its name in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-056", compiled);
