import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-011")!);
const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion");
if (onDeletion !== undefined) {
  onDeletion.keywords = [];
  onDeletion.actions = onDeletion.actions.filter(
    (action) =>
      !(action.kind === "PlaceUnder" && action.target.isSelf === true && action.target.filter.isSelfRef === true),
  );
  onDeletion.actions.unshift({
    kind: "PlaceUnder",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    underFilter: { controller: "mine", kind: ["Tamer"] },
    optional: true,
  });
}

const module = registerIrCard("BT12-011", compiled);

export default module;
