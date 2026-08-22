import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: [{ kind: "GainKeyword", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Veemon", "Veedramon"], match: "name" }] }, count: 1 }, keyword: { keyword: "Blocker", raw: "＜Blocker＞" }, duration: "untilOpponentTurnEnd" }, { kind: "GainKeyword", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Veemon", "Veedramon"], match: "name" }] }, count: 1 }, keyword: { keyword: "Evade", raw: "＜Evade＞" }, duration: "untilOpponentTurnEnd" }] },
  { trigger: "Static", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] }, actions: [{ kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }, { kind: "ActivateEffect", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] }, count: 1 }, effectType: "WhenDigivolving", count: 1 }] }] },
  { trigger: "Static", actions: [{ kind: "SubTrigger", event: "whenUnsuspended", sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] }, actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "isYourTurn" } }] }], frequency: "OncePerTurn" },
  { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }], isSecurity: true },
], coverage: "full", residual: [] };
registerIrCard("BT11-112", compiled);
