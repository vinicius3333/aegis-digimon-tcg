import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-018")!);
const whenAttacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const securityFallback = whenAttacking?.actions.find((action) => action.kind === "SecurityManipulation");
if (securityFallback?.kind === "SecurityManipulation") {
  securityFallback.condition = { kind: "ifThisEffectDidNotDelete" };
}

const module = registerIrCard("BT12-018", compiled);

export default module;
