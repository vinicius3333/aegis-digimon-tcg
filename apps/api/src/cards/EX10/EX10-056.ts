import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX10-056")!;
const module = registerIrCard("EX10-056", compiled);

export default module;
