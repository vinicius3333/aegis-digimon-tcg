import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
registerIrCard("ST2-07", compiledEffects["ST2-07"] as CompiledCard);
