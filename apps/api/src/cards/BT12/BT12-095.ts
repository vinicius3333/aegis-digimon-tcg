import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-095")!);
for (const trigger of compiled.effects) {
  if (trigger.trigger !== "OnPlay" && trigger.trigger !== "StartOfYourMainPhase") continue;
  const blocker = trigger.actions.find((action) => action.kind === "GainKeyword");
  if (blocker?.target !== undefined) blocker.target.sameTarget = true;
}

const module = registerIrCard("BT12-095", compiled);

export default module;
