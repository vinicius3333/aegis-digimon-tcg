import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX10-034")!;
const module = registerIrCard("EX10-034", compiled);

export default module;
