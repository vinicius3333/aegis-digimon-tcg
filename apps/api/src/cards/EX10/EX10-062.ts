import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX10-062")!;
const module = registerIrCard("EX10-062", compiled);

export default module;
