// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mother D-Reaper"],
                  match: "name",
                },
              ],
            },
            raw: "you have a [Mother D-Reaper] in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-050", compiled);
