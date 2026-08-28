import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = { effects: [], coverage: "full", residual: [] };
registerIrCard("BT11-035", compiled);
