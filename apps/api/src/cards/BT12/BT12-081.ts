import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-081")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const playFromTamer = whenDigivolving?.actions.find((action) => action.kind === "PlayWithoutCost");
if (playFromTamer?.kind === "PlayWithoutCost") playFromTamer.from = ["digivolutionCardsUnderTamers"];
if (whenDigivolving !== undefined) {
  whenDigivolving.actions[1] = {
    kind: "Digivolve",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Quartzmon"], match: "name" }] },
    from: ["hand", "digivolutionCardsUnderTamers"],
    payCost: true,
    costDelta: -3,
    optional: true,
    condition: { kind: "selfDigivolutionCountAtLeast", value: 4 },
  };
}
const saveRequirement = compiled.digivolutionRequirement?.find((requirement) => requirement.traits?.includes("Save"));
if (saveRequirement !== undefined) saveRequirement.colors = ["Yellow", "Green", "Purple"];
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
const draw = inherited?.actions[0];
if (draw?.kind === "Draw") {
  draw.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-081", compiled);
