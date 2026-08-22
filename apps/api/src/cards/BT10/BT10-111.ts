import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT10-111")!;
const module = registerIrCard("BT10-111", compiled);

export default module;
