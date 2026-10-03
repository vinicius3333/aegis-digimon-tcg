import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-037")!);
compiled.digiXrosRequirement = [{ materials: [{ texts: ["Save"] }], count: 2, maxMaterials: 1 }];
const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion");
if (onDeletion !== undefined) {
  onDeletion.keywords = [];
  onDeletion.actions = onDeletion.actions.filter(
    (action) =>
      !(action.kind === "PlaceUnder" && action.target.isSelf === true && action.target.filter.isSelfRef === true),
  );
  onDeletion.actions.unshift({
    effectTextPart: "[On Deletion] ＜Save＞.",
    kind: "PlaceUnder",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    underFilter: { controller: "mine", kind: ["Tamer"] },
    optional: true,
  });
  const placeSaveCard = onDeletion.actions[1];
  if (placeSaveCard?.kind === "PlaceUnder") {
    placeSaveCard.effectTextPart =
      "Then, place 1 Digimon card with ＜Save＞ in its text from your trash under 1 of your Tamers.";
  }
}
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && effect.isInherited === true);
const dp = inherited?.actions.find((action) => action.kind === "ModifyDP");
if (dp?.kind === "ModifyDP") {
  dp.condition = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}

const module = registerIrCard("BT12-037", compiled);

export default module;
