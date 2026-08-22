// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [{
    trigger: "OpponentsTurn",
    isInherited: true,
    frequency: "OncePerTurn",
    actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{
      kind: "RedirectAttack",
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] } },
      cost: { kind: "trash", target: { count: 1, filter: { zone: "digivolutionCards", faceDown: true, position: "bottom", hostFilter: { kind: ["Tamer"], controller: "mine" } } } },
      optional: false,
      abortOnDecline: true,
    }] }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-003", compiled);
