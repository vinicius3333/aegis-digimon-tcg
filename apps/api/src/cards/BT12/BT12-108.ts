import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-108")!);
compiled.effects = compiled.effects.filter((effect) => effect.trigger !== "Security");

registerIrCard("BT12-108", compiled);

export default compiled;
