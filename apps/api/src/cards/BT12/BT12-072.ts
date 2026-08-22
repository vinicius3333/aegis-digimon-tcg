import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-072")!);
const effect = compiled.effects[0];
if (effect?.actions[0]?.kind === "PlaceUnder") effect.actions[0].position = "bottom";
const module = registerIrCard("BT12-072", compiled);

export default module;
