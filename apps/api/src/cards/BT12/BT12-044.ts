import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-044")!);
const turnEffect = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const keywordAction = turnEffect?.actions[0];
if (keywordAction?.kind === "GainKeyword" && keywordAction.scaling !== undefined) {
  keywordAction.scaling.unit = "cards";
}

registerIrCard("BT12-044", compiled);

export default compiled;
