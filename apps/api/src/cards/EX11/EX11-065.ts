import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX11-065")!;
const module = registerIrCard("EX11-065", compiled);

export default module;
