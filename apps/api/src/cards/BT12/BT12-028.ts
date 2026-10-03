import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-028")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const restriction = whenDigivolving?.actions.find((action) => action.kind === "Restrict");
if (restriction?.kind === "Restrict") {
  restriction.condition = { kind: "isDnaDigivolving" };
  restriction.effectTextPart =
    "Then, when DNA digivolving, 2 of your opponent's Digimon with no digivolution cards in play can't attack until the end of your opponent's turn.";
}
const trashDigivolution = whenDigivolving?.actions.find((action) => action.kind === "TrashDigivolution");
if (trashDigivolution?.kind === "TrashDigivolution") {
  trashDigivolution.effectTextPart =
    "[When Digivolving] Trash the top 3 digivolution cards of all of your opponent's Digimon.";
}
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
