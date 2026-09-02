import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const catalogCompiled = getCompiledCard("BT2-097");
if (catalogCompiled === undefined) {
  throw new Error("Missing compiled IR for BT2-097");
}

export const compiled: CompiledCard = catalogCompiled;

registerIrCard("BT2-097", compiled);
