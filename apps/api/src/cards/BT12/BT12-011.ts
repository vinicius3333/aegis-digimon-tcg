import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-011")!);
const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion");
if (onDeletion !== undefined) {
  // Save must resolve before the printed "Then" placement. Keeping Save only as
  // effect keyword metadata lets the generic synthesized Save timing race the
  // action-bearing On Deletion effect, which can select this card from trash first.
  onDeletion.keywords = [];
  onDeletion.actions.unshift({
    kind: "PlaceUnder",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    underFilter: { controller: "mine", kind: ["Tamer"] },
    optional: true,
  });
}

const module = registerIrCard("BT12-011", compiled);

export default module;
