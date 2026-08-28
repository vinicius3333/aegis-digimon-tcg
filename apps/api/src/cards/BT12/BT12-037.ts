import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-037")!);
const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion");
if (onDeletion !== undefined) {
  onDeletion.keywords = [];
  onDeletion.actions.unshift({
    kind: "PlaceUnder",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    underFilter: { controller: "mine", kind: ["Tamer"] },
    optional: true,
  });
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
