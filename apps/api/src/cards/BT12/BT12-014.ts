import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-014")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  const deletion = whenDigivolving.actions.find((action) => action.kind === "Delete");
  if (deletion?.kind === "Delete") whenDigivolving.actions = [
    { kind: "DeletionMaxDpModifier", amount: 3000, scope: "self", duration: "forTheTurn", scaling: { per: 2, unit: "digivolutionCards" } },
    deletion,
  ];
}
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const attack = inherited?.actions[0];
if (attack?.kind === "Delete") attack.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-014", compiled);
