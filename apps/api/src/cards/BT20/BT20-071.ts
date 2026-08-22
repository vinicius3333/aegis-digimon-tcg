import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT20-071")!;
const module = registerIrCard("BT20-071", compiled);

export default module;
