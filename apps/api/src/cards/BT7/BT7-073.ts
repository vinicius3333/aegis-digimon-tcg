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
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              kind: ["Tamer"],
              color: "purple",
            },
            count: 1,
            upTo: false,
            isSelf: false,
          },
          from: "hand",
          costSuffix: "2",
          asIf: {
            level: 3,
            color: "purple",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["Koichi Kimura"],
                  match: "name",
                },
              ],
            },
            raw: "a card with [Hybrid] in its traits or [Koichi Kimura] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    },
  ],
};

registerIrCard("BT7-073", compiled);
