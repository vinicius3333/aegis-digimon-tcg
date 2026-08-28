import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled = compiledEffects["ST2-05"] as CompiledCard;
registerIrCard("ST2-05", compiled);
