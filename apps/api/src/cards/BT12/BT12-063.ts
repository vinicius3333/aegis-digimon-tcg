import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-063")!);
compiled.effects = compiled.effects.filter(
  (effect) => !(effect.trigger === "Static" && effect.actions.some((action) => action.kind === "RawUnparsed")),
);
compiled.coverage = "full";
compiled.residual = [];
for (const effect of compiled.effects.filter(
  (candidate) => candidate.trigger === "OnPlay" || candidate.trigger === "WhenDigivolving",
)) {
  const reveal = effect.actions.find((action) => action.kind === "RevealAdd");
  if (reveal?.kind === "RevealAdd") for (const add of reveal.add) add.filter.kind = ["Tamer"];
}
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
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const aura = inherited?.actions.find((action) => action.kind === "Aura");
if (aura?.kind === "Aura") {
  aura.while = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}
export default registerIrCard("BT12-063", compiled);
