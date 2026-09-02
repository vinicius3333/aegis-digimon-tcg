import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type SourceBoundModifyDPAction = Extract<Action, { kind: "ModifyDP" }> & { effectSourceBound: true };

const blockedBoost: SourceBoundModifyDPAction = {
  kind: "ModifyDP",
  amount: 2000,
  duration: "forTheTurn",
  effectSourceBound: true,
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenBlocked",
      isInherited: true,
      condition: { kind: "isYourTurn" },
      actions: [blockedBoost],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-012", compiled);
export default compiled;
