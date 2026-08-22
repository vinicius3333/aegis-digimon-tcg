import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-077")!);
const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const rush = digivolving?.actions[0];
if (rush?.kind === "GainKeyword") rush.condition = { kind: "selfDigivolutionCountAtLeast", value: 2 };

registerIrCard("BT12-077", compiled);

export default compiled;
