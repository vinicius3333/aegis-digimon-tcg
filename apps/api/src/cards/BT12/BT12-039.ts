import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-039")!);
const cost = compiled.effects.find((effect) => effect.trigger === "Static");
if (cost !== undefined) cost.trigger = "BeforePayCost";

registerIrCard("BT12-039", compiled);

export default compiled;
