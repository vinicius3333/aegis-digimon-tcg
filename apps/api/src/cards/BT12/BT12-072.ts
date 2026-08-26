import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-072")!);
const effect = compiled.effects[0];
if (effect?.actions[0]?.kind === "PlaceUnder") {
  effect.actions[0].position = "bottom";
  effect.actions[0].underFilter = { isSelfRef: true };
}
const deletionEffect = compiled.effects.find(
  (entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "SubTrigger",
);
const deletionTrigger = deletionEffect?.actions[0];
if (deletionTrigger?.kind === "SubTrigger") deletionTrigger.sourceFilter = { isSelfRef: true };
export default registerIrCard("BT12-072", compiled);
