import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX4-037")!;
const module = registerIrCard("EX4-037", compiled);

export default module;
