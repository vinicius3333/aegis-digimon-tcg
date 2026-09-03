import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const reduceDp: Action = {
  kind: "ModifyDP",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: -6000,
  duration: "untilOpponentTurnEnd",
  cost: {
    kind: "trash",
    target: { filter: { controller: "mine", zone: "security" }, count: 1 },
    raw: "By trashing the top or bottom card of your security stack",
  },
  optional: true,
  abortOnDecline: true,
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    { trigger: "OnPlay", actions: [reduceDp] },
    { trigger: "WhenDigivolving", actions: [reduceDp] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "Recover",
              amount: 1,
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-038", compiled);
export { compiled };
