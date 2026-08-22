import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT22-092")!;
const module = registerIrCard("BT22-092", compiled);

export default module;
