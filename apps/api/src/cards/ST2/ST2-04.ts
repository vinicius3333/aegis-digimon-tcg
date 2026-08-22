import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled = compiledEffects["ST2-04"] as CompiledCard;
registerIrCard("ST2-04", compiled);
