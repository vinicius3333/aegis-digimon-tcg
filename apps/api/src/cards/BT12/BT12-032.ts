import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-032")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const play = whenDigivolving?.actions.find((action) => action.kind === "PlayWithoutCost");
if (play?.kind === "PlayWithoutCost") {
  play.target.filter.nameOrTrait = [
    { tokens: ["Hybrid"], match: "trait" },
    { tokens: ["Aqua"], match: "traitContains" },
    { tokens: ["Sea Animal"], match: "trait" },
  ];
}

const module = registerIrCard("BT12-032", compiled);

export default module;
