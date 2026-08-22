import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-014")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  whenDigivolving.actions[0] = {
    kind: "DeleteByDPBudget",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
    baseBudget: 4000,
    budgetBonus: { per: 3000, perCount: 2, unit: "selfDigivolutionCards" },
  };
}
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const attack = inherited?.actions[0];
if (attack?.kind === "Delete") attack.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-014", compiled);
