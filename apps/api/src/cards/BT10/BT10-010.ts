import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Asuramon is a vanilla Digimon; registering its empty effect list keeps the
// card's implementation explicit and gives the catalog/effect parity checker a
// concrete module to load.
const compiled: CompiledCard = { effects: [], coverage: "full", residual: [] };

registerIrCard("BT10-010", compiled);
