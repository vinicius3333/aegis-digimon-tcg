import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = { effects: [{ trigger: "StartOfYourTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }], coverage: "full", residual: [] };
registerIrCard("BT11-047", compiled);
