import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX11-058")!;
const module = registerIrCard("EX11-058", compiled);

export default module;
