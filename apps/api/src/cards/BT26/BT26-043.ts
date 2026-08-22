// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTarget = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 };
const setup = [
  { kind: "Suspend", target: opponentTarget },
  { kind: "PlaceUnder", target: { filter: { zone: "deck", controller: "mine" }, count: 1 }, from: ["deck"], underFilter: { isSelfRef: true }, position: "bottom", faceDown: true, optional: true, abortOnDecline: true },
  { kind: "Restrict", target: opponentTarget, restriction: "unsuspend", duration: "untilOpponentTurnEnd", scaling: { unit: "faceDownDigivolutionCards", per: 1 } },
];
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: setup },
  { trigger: "WhenDigivolving", actions: setup },
  { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{
    kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"] },
    actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, optional: true }],
  }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-043", compiled);
export default compiled;
