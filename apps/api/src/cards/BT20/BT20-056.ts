import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT20-056")!;
const module = registerIrCard("BT20-056", compiled);

export default module;
