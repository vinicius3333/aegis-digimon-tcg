import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled = { effects: [], coverage: "full", residual: [] } satisfies CompiledCard;
registerIrCard("BT10-047", compiled);
