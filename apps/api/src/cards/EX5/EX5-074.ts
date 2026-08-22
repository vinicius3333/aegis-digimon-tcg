// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-074")!;
export const compiled: CompiledCard = structuredClone(generated);
const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
if (allTurns) {
  allTurns.actions = [{
    kind: "GrantStatic",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    grant: "immuneToOpponentDigimonEffects",
    duration: "permanent",
  }];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-074", compiled);
