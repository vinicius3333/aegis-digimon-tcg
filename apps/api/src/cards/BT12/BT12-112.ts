import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-112")!);
const registered = registerIrCard("BT12-112", compiled);

export default registered;
