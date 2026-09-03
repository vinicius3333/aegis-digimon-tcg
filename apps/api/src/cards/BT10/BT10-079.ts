import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = { effects: [], coverage: "full", residual: [] } satisfies CompiledCard;

registerIrCard("BT10-079", compiled);
