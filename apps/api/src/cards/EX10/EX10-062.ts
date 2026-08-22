import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenLinkTrashed", actions: [{ kind: "Draw", controller: "mine", amount: 1, cost: { kind: "suspend", target: { isSelf: true } } }] }] },
    { trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "AppFuse", from: ["hand"], optional: true }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-062", compiled);
