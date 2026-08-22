import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX11-066")!;
const module = registerIrCard("EX11-066", compiled);

export default module;
