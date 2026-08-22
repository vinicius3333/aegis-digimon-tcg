import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX4-069")!;
const module = registerIrCard("EX4-069", compiled);

export default module;
