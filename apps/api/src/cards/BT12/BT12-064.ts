import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-064")!);
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
if (inherited?.actions[0]?.kind === "Aura") {
  inherited.actions[0].while = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}
const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const dedigivolve = digivolving?.actions[0];
if (dedigivolve?.kind === "DeDigivolve") {
  dedigivolve.scaling = { per: 2, levelCeilingAdd: 1, unit: "digivolutionCards" };
}

registerIrCard("BT12-064", compiled);

export default compiled;
