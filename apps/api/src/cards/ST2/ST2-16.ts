import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = compiledEffects["ST2-16"] as CompiledCard;
registerIrCard("ST2-16", compiled);
