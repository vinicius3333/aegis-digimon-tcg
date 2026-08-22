import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX10-004")!;
const module = registerIrCard("EX10-004", compiled);

export default module;
