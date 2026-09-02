import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const play: Extract<Action, { kind: "PlayWithoutCost" }> = {
  kind: "PlayWithoutCost",
  target: { filter: { controller: "mine", kind: ["Tamer"], playCostLte: 3 }, count: 1 },
  from: ["hand"],
  payCost: false,
  optional: true,
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [play] },
    { trigger: "WhenDigivolving", actions: [play] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
            raw: "you have a Tamer in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-052", compiled);
