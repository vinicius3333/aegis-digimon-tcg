import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT22-067")!;
const module = registerIrCard("BT22-067", compiled);

export default module;
