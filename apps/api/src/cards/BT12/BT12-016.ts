import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-016")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const followUp = whenDigivolving?.actions.find((action) => action.kind === "Digivolve");
if (followUp?.kind === "Digivolve") {
  followUp.condition = { kind: "ifThisEffectDidNotDelete" };
  followUp.reduceCost = 1;
}
if (whenDigivolving !== undefined) {
  whenDigivolving.actions = whenDigivolving.actions.filter((action) => action.kind !== "Replacement");
}
const inherited = compiled.effects.find((effect) => effect.trigger === "EndOfAttack");
const gainMemory = inherited?.actions.find((action) => action.kind === "GainMemory");
if (gainMemory?.kind === "GainMemory") {
  gainMemory.condition = {
    kind: "allOf",
    conditions: [
      { kind: "opponentHasNone", filter: { kind: ["Digimon"] } },
      { kind: "selfHasNameContaining", names: ["Growlmon", "Gallantmon"] },
    ],
  };
}

const module = registerIrCard("BT12-016", compiled);

export default module;
