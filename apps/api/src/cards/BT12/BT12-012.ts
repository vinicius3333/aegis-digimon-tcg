import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-012")!);
const play = compiled.effects[0]?.actions[0];
if (play?.kind === "PlayWithoutCost") play.suspended = true;

registerIrCard("BT12-012", compiled);

export default compiled;
