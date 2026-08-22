import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX11-057")!;
const module = registerIrCard("EX11-057", compiled);

export default module;
