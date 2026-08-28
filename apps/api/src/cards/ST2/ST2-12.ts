import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
registerIrCard("ST2-12", compiledEffects["ST2-12"] as CompiledCard);
