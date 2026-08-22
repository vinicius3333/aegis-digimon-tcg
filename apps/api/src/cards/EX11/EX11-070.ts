import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX11-070")!;
const module = registerIrCard("EX11-070", compiled);

export default module;
