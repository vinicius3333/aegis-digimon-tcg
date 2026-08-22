import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-074")!);
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const draw = inherited?.actions[0];
if (draw?.kind === "Draw") {
  draw.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
}

const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
const onPlayDraw = onPlay?.actions[0];
if (onPlayDraw?.kind === "Draw") {
  onPlayDraw.optional = false;
  onPlayDraw.abortOnDecline = false;
}

const module = registerIrCard("BT12-074", compiled);

export default module;
