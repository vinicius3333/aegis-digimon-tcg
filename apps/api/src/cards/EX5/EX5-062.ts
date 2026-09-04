// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-062 Anubismon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = structuredClone(getCompiledCard("EX5-062")!);
for (const effect of compiled.effects ?? []) {
  if (effect.trigger !== "Main" && effect.trigger !== "WhenDigivolving") continue;
  effect.sharedUseKey = "ir-shared-0";
  effect.actions = effect.actions.filter((action) => action.kind !== "Replacement");
  const trash = effect.actions.find((action) => action.kind === "Trash");
  if (trash?.kind === "Trash") trash.trackCount = "anubismonTrashed";
  const play = effect.actions.find((action) => action.kind === "PlayWithoutCost");
  if (play?.kind === "PlayWithoutCost") {
    play.reduceCostBy = 3;
    play.reduceCostByScaling = { per: 1, unit: "namedCount", countSource: "anubismonTrashed" };
  }
}
const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const watcherTrigger = watcher?.actions.find((action) => action.kind === "SubTrigger");
const draw = watcher?.actions.find((action) => action.kind === "Draw");
if (watcherTrigger?.kind === "SubTrigger" && draw?.kind === "Draw") {
  watcherTrigger.sourceFilter = { ...(watcherTrigger.sourceFilter ?? {}), byEffect: true };
  draw.condition = { kind: "ifThisEffectDidNotDelete" };
  watcherTrigger.actions.push(draw);
  watcher.actions = [watcherTrigger];
}
if (watcher) watcher.frequency = "OncePerTurn";
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-062", compiled);
