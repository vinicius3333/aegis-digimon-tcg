import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-028")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const restriction = whenDigivolving?.actions.find((action) => action.kind === "Restrict");
if (restriction?.kind === "Restrict") restriction.condition = { kind: "isDnaDigivolving" };
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const gainMemory = inherited?.actions.find((action) => action.kind === "GainMemory");
if (gainMemory?.kind === "GainMemory") {
  gainMemory.condition = {
    kind: "anyOf",
    conditions: [
      { kind: "selfHasNameContaining", names: ["Imperialdramon"] },
      { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] } },
    ],
  };
}

const module = registerIrCard("BT12-028", compiled);

export default module;
