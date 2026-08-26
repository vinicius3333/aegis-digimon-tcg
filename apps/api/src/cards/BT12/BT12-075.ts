import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-075")!);
const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
const recover = onPlay?.actions.find((action) => action.kind === "Return");
if (recover?.kind === "Return") {
  recover.target.filter = {
    controller: "mine",
    zone: "underTamers",
    kind: ["Digimon"],
    keywords: ["Save"],
  };
}
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const draw = inherited?.actions.find((action) => action.kind === "Draw");
if (draw?.kind === "Draw") {
  draw.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
}

export default registerIrCard("BT12-075", compiled);
