import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = getCompiledCard("BT12-056")!;

export default registerIrCard("BT12-056", compiled);
