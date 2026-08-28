import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
registerIrCard("ST2-13", compiledEffects["ST2-13"] as CompiledCard);
