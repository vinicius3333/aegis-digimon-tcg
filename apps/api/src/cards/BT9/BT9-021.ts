import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT9-021")!;
const module = registerIrCard("BT9-021", compiled);

export default module;
