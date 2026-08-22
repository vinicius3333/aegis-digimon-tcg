// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-062 Anubismon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-062")!;
const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const watcherTrigger = watcher?.actions.find((action) => action.kind === "SubTrigger");
const draw = watcher?.actions.find((action) => action.kind === "Draw");
if (watcherTrigger?.kind === "SubTrigger" && draw?.kind === "Draw") {
  draw.condition = { kind: "ifThisEffectDidNotDelete" };
  watcherTrigger.actions.push(draw);
  watcher.actions = [watcherTrigger];
}
if (watcher) watcher.frequency = "OncePerTurn";
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-062", compiled);
