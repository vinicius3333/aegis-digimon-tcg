import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
registerIrCard("ST2-09", compiledEffects["ST2-09"] as CompiledCard);
