// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashThenDelete = {
  kind: "Delete",
  target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } },
  cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "OnPlay", actions: [trashThenDelete] },
    { trigger: "OnDeletion", actions: [trashThenDelete] },
    { trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn", target: { isSelf: true } }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-013", compiled);
