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
  suspendAll.effectTextPart =
    "[When Digivolving] Suspend all Digimon except this one, and suspend all of you and your opponent's Tamers.";
}
const memory = whenDigivolving?.actions.find((action) => action.kind === "GainMemory");
if (memory?.kind === "GainMemory" && memory.scaling !== undefined) {
  memory.scaling.filter = { controller: "any", suspended: true, kind: ["Digimon", "Tamer"] };
}
if (memory?.kind === "GainMemory") {
  memory.effectTextPart = "Then, for every 2 suspended Digimon and Tamers, gain 1 memory.";
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
const attackSuspend = whenAttacking?.actions.find((action) => action.kind === "Suspend");
if (attackSuspend?.kind === "Suspend") {
  attackSuspend.effectTextPart = "[When Attacking] Suspend 1 of your opponent's Digimon or Tamers.";
}
const trash = whenAttacking?.actions.find((action) => action.kind === "Trash");
if (whenAttacking !== undefined && trash?.kind === "Trash") {
  const index = whenAttacking.actions.indexOf(trash);
  whenAttacking.actions[index] = {
    effectTextPart:
      "Then, trash 1 card from the top of your opponent’s security stack for every 5 suspended Digimon and Tamers.",
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
