import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("ST19-02")!;
const module = registerIrCard("ST19-02", compiled);

export default module;
