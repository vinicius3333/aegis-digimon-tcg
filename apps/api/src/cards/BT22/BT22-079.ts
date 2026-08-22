import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT22-079")!;
const module = registerIrCard("BT22-079", compiled);

export default module;
