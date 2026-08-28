import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-110")!);
const registered = registerIrCard("BT12-110", compiled);

export default registered;
