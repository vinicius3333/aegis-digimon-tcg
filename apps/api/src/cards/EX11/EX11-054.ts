import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX11-054")!;
const module = registerIrCard("EX11-054", compiled);

export default module;
