// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const bounce = {
  actions: [
    { kind: "Return", target: { filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] }, count: 1 }, from: ["digivolutionCards"], to: "hand", storeAs: "selectedHybridLevel" },
    { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], levelEq: "selectedHybridLevel" }, count: 1 }, to: "hand", returnDigivolutionCardsFirst: true },
  ],
};
const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bounce-hybrid", ...bounce },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bounce-hybrid", ...bounce },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToHand", actions: [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, optional: true }] }] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-029", compiled);
