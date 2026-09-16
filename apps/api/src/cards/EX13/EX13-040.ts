import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimonOrTamer = {
  filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
  count: 1,
} satisfies Target;

const lockUnsuspend = {
  kind: "Restrict",
  target: opponentDigimonOrTamer,
  restriction: "unsuspend",
  duration: "untilOpponentTurnEnd",
} satisfies Action;

const suspendOnSelfSuspend = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  actions: [{ kind: "Suspend", target: opponentDigimonOrTamer }],
} satisfies Action;

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [lockUnsuspend] },
    { trigger: "WhenDigivolving", actions: [lockUnsuspend] },
    { trigger: "AllTurns", actions: [suspendOnSelfSuspend] },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], suspended: true },
            count: "all",
          },
          effect: { kind: "modifyDP", amount: 1000 },
          raw: "All of your suspended Digimon get +1000 DP",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-040", compiled);
