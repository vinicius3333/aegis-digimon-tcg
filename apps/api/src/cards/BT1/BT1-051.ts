import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = { effects: [], coverage: "full", residual: [] };

registerIrCard("BT1-051", compiled);

export default compiled;
