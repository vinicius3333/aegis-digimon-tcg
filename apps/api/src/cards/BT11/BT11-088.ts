// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const enter: any[] = [
  {
    kind: "PlaceUnder",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    targetIsPermanent: true,
    underFilter: { controller: "opponent", excludeSelf: true, kind: ["Digimon"] },
  },
  {
    kind: "Trash",
    target: { filter: { zone: "hand", controller: "opponent" }, count: 1 },
    condition: { kind: "opponentHas", filter: { zone: "battleArea", kind: ["Digimon"] }, countMax: 1 },
  },
];
const stackCost = { kind: "trash", target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, count: 1 } };
const watch = (event: string) => ({
  kind: "SubTrigger",
  event,
  sourceFilter: { controller: "opponent", kind: ["Digimon"] },
  actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, cost: stackCost, optional: true, abortOnDecline: true }],
});
const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: enter },
    { trigger: "WhenDigivolving", actions: enter },
    {
      trigger: "AllTurns",
      actions: [watch("whenOneOfYoursDigivolves"), watch("onAddDigivolutionCards")],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-088", compiled);
