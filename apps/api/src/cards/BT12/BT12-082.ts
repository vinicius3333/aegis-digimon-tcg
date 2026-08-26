import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-082")!);
const hasBaalmonOrXAntibody = {
  kind: "anyOf" as const,
  conditions: [
    { kind: "selfDigivolutionStackMatchesFilter" as const, filter: { nameOrTrait: [{ tokens: ["Baalmon"], match: "name" as const }] } },
    {
      kind: "selfDigivolutionStackHasTrait" as const,
      filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" as const }] },
    },
  ],
};
const millOrDelete = compiled.effects.find(
  (effect) => effect.trigger === "WhenDigivolving" && effect.actions.some((action) => action.kind === "TrashTopDeck"),
);
if (millOrDelete !== undefined) {
  const trash = millOrDelete.actions.find((action) => action.kind === "TrashTopDeck");
  const remove = millOrDelete.actions.find((action) => action.kind === "Delete");
  if (trash?.kind === "TrashTopDeck") trash.condition = { kind: "not", condition: hasBaalmonOrXAntibody };
  if (remove?.kind === "Delete") remove.condition = hasBaalmonOrXAntibody;
}
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const aura = inherited?.actions.find((action) => action.kind === "Aura");
if (aura?.kind === "Aura") {
  aura.while = {
    kind: "anyOf",
    conditions: [
      { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Wizard"], match: "trait" }] } },
      { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Demon Lord"], match: "trait" }] } },
    ],
  };
}

export default registerIrCard("BT12-082", compiled);
