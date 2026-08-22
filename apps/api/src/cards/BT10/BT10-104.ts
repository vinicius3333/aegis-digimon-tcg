import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT10-104")!;
const module = registerIrCard("BT10-104", compiled);

export default module;
