// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = { effects: [{ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controllerDefault: "mine", kind: ["Tamer"] }, actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] }], frequency: "OncePerTurn", isInherited: true }], coverage: "full", residual: [] };
registerIrCard("BT11-050", compiled);
