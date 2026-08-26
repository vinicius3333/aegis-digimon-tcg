import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-030")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const unsuspend = whenDigivolving?.actions.find((action) => action.kind === "Unsuspend");
if (unsuspend?.kind === "Unsuspend") {
  unsuspend.condition = { kind: "selfDigivolutionStackMatchesFilter", filter: { colors: ["Blue"] } };
}
const suspend = whenDigivolving?.actions.find((action) => action.kind === "Suspend");
if (suspend?.kind === "Suspend") {
  suspend.condition = { kind: "selfDigivolutionStackMatchesFilter", filter: { colors: ["Green"] } };
}
const endOfAttack = compiled.effects.find((effect) => effect.trigger === "EndOfAttack");
const digivolve = endOfAttack?.actions.find((action) => action.kind === "Digivolve");
if (digivolve?.kind === "Digivolve") digivolve.costDelta = -2;
if (endOfAttack !== undefined) {
  endOfAttack.actions = endOfAttack.actions.filter((action) => action.kind !== "Replacement");
}

const module = registerIrCard("BT12-030", compiled);

export default module;
