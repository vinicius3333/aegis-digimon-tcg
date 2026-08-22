import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-103")!);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const securityAttackReduction = main?.actions[1];
if (securityAttackReduction !== undefined) {
  securityAttackReduction.condition = {
    kind: "selfDigivolutionCountAtLeast",
    value: 4,
  };
}

registerIrCard("BT12-103", compiled);

export default compiled;
