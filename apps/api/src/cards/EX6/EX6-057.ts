import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("EX6-057")!;
const module = registerIrCard("EX6-057", compiled);

export default module;
