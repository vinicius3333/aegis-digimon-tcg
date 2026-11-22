import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Target } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };

const shieldThenDeDigivolve: Action[] = [
  {
    kind: "GrantStatic",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    grant: "protection",
    tokens: ["beDeDigivolved"],
    duration: "untilOpponentTurnEnd",
  },
  {
    kind: "DeDigivolve",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: 1,
    condition: { kind: "isOpponentsTurn", raw: "if it's their turn" },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "OnPlay", actions: shieldThenDeDigivolve },
    { trigger: "WhenDigivolving", actions: shieldThenDeDigivolve },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Unsuspend", target: self, optional: true }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-059", compiled);
