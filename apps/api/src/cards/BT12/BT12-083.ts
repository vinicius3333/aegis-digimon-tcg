import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-083")!);
const endOfTurn = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn");
if (endOfTurn !== undefined) {
  endOfTurn.actions = [{
    kind: "Attack",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    withoutSuspending: true,
    optional: true,
    condition: { kind: "selfDigivolutionCountAtLeast", value: 4 },
  }];
}
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const saveRequirement = compiled.digivolutionRequirement?.find(
  (requirement) => requirement.texts?.includes("Save"),
);
if (saveRequirement !== undefined) saveRequirement.colors = ["Red", "Black", "Purple"];
const levelScaling = whenDigivolving?.actions[1];
if (levelScaling?.kind === "CostModifier" && levelScaling.scaling !== undefined) {
  levelScaling.scaling.unit = "colors";
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-083", compiled);
