import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT22-073")!;
const module = registerIrCard("BT22-073", compiled);

export default module;
