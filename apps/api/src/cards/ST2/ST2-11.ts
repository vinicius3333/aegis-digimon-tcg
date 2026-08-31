import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = compiledEffects["ST2-11"] as CompiledCard;
registerIrCard("ST2-11", compiled);
