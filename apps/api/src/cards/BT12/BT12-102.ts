import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-102")!);
compiled.effects = compiled.effects.filter((effect) => effect.trigger !== "Security");

registerIrCard("BT12-102", compiled);

export default compiled;
