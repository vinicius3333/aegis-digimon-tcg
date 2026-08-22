import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-040")!);
const cost = compiled.effects.find((effect) => effect.trigger === "Static");
if (cost !== undefined) cost.trigger = "BeforePayCost";

registerIrCard("BT12-040", compiled);

export default compiled;
