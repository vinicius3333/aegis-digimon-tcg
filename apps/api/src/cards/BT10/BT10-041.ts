import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT10-041")!;
const module = registerIrCard("BT10-041", compiled);

export default module;
