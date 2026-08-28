import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = getCompiledCard("BT2-094") as CompiledCard;

registerIrCard("BT2-094", compiled);
