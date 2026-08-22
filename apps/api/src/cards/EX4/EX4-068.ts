import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX4-068")!;
const module = registerIrCard("EX4-068", compiled);

export default module;
