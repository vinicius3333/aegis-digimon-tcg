import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-054")!);
const play = compiled.effects[0]?.actions[0];
if (play?.kind === "PlayWithoutCost") play.target.count = 2;

registerIrCard("BT12-054", compiled);

export default compiled;
