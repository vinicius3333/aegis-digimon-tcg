import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX6-068")!;
const module = registerIrCard("EX6-068", compiled);

export default module;
