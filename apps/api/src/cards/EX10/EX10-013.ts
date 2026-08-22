import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX10-013")!;
const module = registerIrCard("EX10-013", compiled);

export default module;
