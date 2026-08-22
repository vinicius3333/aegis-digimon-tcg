import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT22-075")!;
const module = registerIrCard("BT22-075", compiled);

export default module;
