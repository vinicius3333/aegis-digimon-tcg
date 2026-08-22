import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT9-012")!;
const module = registerIrCard("BT9-012", compiled);

export default module;
