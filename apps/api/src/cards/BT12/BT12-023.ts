import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-023")!);
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
if (inherited !== undefined) inherited.trigger = "WhenAttacking";

registerIrCard("BT12-023", compiled);

export default compiled;
