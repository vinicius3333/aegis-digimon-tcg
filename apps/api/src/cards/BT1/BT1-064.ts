// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = { effects: [], coverage: "full", residual: [] };

registerIrCard("BT1-064", compiled);

export default compiled;
