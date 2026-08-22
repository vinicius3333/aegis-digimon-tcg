// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenDigivolving",
    actions: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", from: ["deck"], toTop: true, amount: 1, raw: "＜Recovery +1 (Deck)＞", condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3, raw: "you have 3 or fewer security cards" } }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-09", compiled);
export { compiled };
