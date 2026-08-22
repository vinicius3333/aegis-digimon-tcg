import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
registerIrCard("ST2-16", compiledEffects["ST2-16"] as CompiledCard);
