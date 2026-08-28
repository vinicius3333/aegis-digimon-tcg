import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-057")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const suspendAll = whenDigivolving?.actions.find((action) => action.kind === "Suspend");
if (suspendAll?.kind === "Suspend") {
  suspendAll.target = {
    filter: { controller: "any", kind: ["Digimon", "Tamer"], excludeSelf: true },
    count: "all",
  };
}
const memory = whenDigivolving?.actions.find((action) => action.kind === "GainMemory");
if (memory?.kind === "GainMemory" && memory.scaling !== undefined) {
  memory.scaling.filter = { controller: "any", suspended: true, kind: ["Digimon", "Tamer"] };
}
const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
if (allTurns !== undefined) {
  allTurns.actions = [
    {
      kind: "Restrict",
      target: {
        filter: { controller: "any", kind: ["Digimon", "Tamer"], excludeSelf: true },
        count: "all",
      },
      restriction: "unsuspend",
      duration: "permanent",
      whileMatchesTargetFilter: true,
    },
  ];
}
const whenAttacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const trash = whenAttacking?.actions.find((action) => action.kind === "Trash");
if (whenAttacking !== undefined && trash?.kind === "Trash") {
  const index = whenAttacking.actions.indexOf(trash);
  whenAttacking.actions[index] = {
    kind: "SecurityManipulation",
    op: "trashTop",
    controller: "opponent",
    amount: 1,
    scaling: {
      per: 5,
      filter: { controller: "any", suspended: true, kind: ["Digimon", "Tamer"] },
      unit: "cards",
    },
  };
}

export default registerIrCard("BT12-057", compiled);
