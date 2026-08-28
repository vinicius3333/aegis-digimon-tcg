import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-074")!);
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const draw = inherited?.actions[0];
if (draw?.kind === "Draw") {
  draw.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
}

export default registerIrCard("BT12-074", compiled);
