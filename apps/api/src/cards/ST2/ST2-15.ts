import { compiledEffects, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

registerIrCard("ST2-15", compiledEffects["ST2-15"] as CompiledCard);
