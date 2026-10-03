import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-077")!);
const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const rush = digivolving?.actions[0];
if (rush?.kind === "GainKeyword") rush.condition = { kind: "selfDigivolutionCountAtLeast", value: 2 };
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const draw = inherited?.actions[0];
if (draw?.kind === "Draw") {
  draw.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
}
const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion");
if (onDeletion !== undefined) {
  onDeletion.keywords = [];
  const save = onDeletion.actions[0];
  if (save?.kind === "PlaceUnder") {
    save.effectTextPart = "[On Deletion] ＜Save＞ (You may place this card under one of your Tamers.)";
  }
  const mandatoryThen = onDeletion.actions[1];
  if (mandatoryThen?.kind === "PlaceUnder") {
    mandatoryThen.optional = false;
    mandatoryThen.effectTextPart =
      "Then, place 1 Digimon card with ＜Save＞ in its text from your trash under 1 of your Tamers.";
  }
}

export default registerIrCard("BT12-077", compiled);
