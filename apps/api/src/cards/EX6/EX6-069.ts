import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX6-069")!;
const module = registerIrCard("EX6-069", compiled);

export default module;
