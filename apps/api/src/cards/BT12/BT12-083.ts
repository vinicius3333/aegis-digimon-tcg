import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-083")!);
const endOfTurn = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn");
if (endOfTurn !== undefined) {
  endOfTurn.actions = [
    {
      kind: "Attack",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      withoutSuspending: true,
      optional: true,
      condition: { kind: "selfDigivolutionCountAtLeast", value: 4 },
    },
  ];
}
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const saveRequirement = compiled.digivolutionRequirement?.find((requirement) => requirement.texts?.includes("Save"));
if (saveRequirement !== undefined) saveRequirement.colors = ["Red", "Black", "Purple"];
const placement = whenDigivolving?.actions[0];
const levelScaling = whenDigivolving?.actions[1];
if (
  placement?.kind === "PlaceUnder" &&
  levelScaling?.kind === "CostModifier" &&
  typeof levelScaling.amount === "number" &&
  levelScaling.scaling !== undefined
) {
  placement.targetIsPermanent = true;
  placement.shedOwnCards = true;
  placement.scaling = { ...levelScaling.scaling, unit: "colors", levelCeilingAdd: levelScaling.amount };
  whenDigivolving!.actions = [placement];
}
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const draw = inherited?.actions.find((action) => action.kind === "Draw");
if (draw?.kind === "Draw") {
  draw.condition = { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] } };
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-083", compiled);
