import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT20-089")!;
const module = registerIrCard("BT20-089", compiled);

export default module;
