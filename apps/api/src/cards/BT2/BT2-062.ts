import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT2-062") as CompiledCard;

registerIrCard("BT2-062", compiled);
