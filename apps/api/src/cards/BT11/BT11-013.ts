// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Red"], playCostLte: 4 }, count: 1 }, from: ["hand"], payCost: false, optional: true }], isInherited: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-013", compiled);
