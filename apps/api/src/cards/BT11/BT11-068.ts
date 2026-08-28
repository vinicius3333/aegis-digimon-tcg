// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const reveal: any = {
  kind: "RevealAdd",
  revealCount: 5,
  add: [
    {
      filter: { controllerDefault: "mine", kind: ["Tamer"], playCostLte: 4 },
      count: 1,
      to: "play",
      optional: true,
    },
  ],
  rest: "deckTopOrBottom",
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [reveal] },
    { trigger: "WhenDigivolving", actions: [reveal] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"], byEffect: true },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "untilOpponentTurnEnd",
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

registerIrCard("BT11-068", compiled);
