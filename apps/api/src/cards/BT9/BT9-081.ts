import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT9-081")!;
const module = registerIrCard("BT9-081", compiled);

export default module;
