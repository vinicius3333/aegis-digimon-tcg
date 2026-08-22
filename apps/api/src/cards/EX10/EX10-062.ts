// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5172: replacement of an existing link card does not fire this watcher;
// only the genuine effect-driven link-trash event is observed.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] }, raw: "your opponent has a Digimon" } }],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "whenLinkTrashed",
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        actions: [{ kind: "Draw", controller: "mine", amount: 1, cost: { kind: "suspend", raw: "by suspending this Tamer" } }],
        raw: "[All Turns] When effects trash any of your Digimon's link cards, by suspending this Tamer, <Draw 1>",
      }],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{
        kind: "AppFuse",
        source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        into: { controller: "mine", kind: ["Digimon"] },
        from: ["hand"],
        optional: true,
      }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-062", compiled);
export default compiled;
