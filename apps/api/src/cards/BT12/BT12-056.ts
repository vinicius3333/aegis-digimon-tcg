import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-056")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const suspend = whenDigivolving?.actions.find((action) => action.kind === "Suspend");
if (suspend?.kind === "Suspend") suspend.effectTextPart = "[When Digivolving] Suspend 1 of your opponent’s Digimon.";
const attack = whenDigivolving?.actions.find((action) => action.kind === "Attack");
if (attack?.kind === "Attack") {
  attack.effectTextPart = "Then, you may attack your opponent's Digimon with this Digimon.";
}

export default registerIrCard("BT12-056", compiled);
