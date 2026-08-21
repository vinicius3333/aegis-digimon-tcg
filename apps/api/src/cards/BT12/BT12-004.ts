// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: {
    controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"],
  }, actions: [{ kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 2000, duration: "forTheTurn" }] }], isInherited: true, frequency: "OncePerTurn" }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT12-004", compiled);
