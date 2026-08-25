import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-041")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const dp = whenDigivolving?.actions.find((action) => action.kind === "ModifyDP");
if (whenDigivolving !== undefined && dp?.kind === "ModifyDP") {
  whenDigivolving.actions = [
    {
      kind: "RepeatPerCount",
      countSource: "BT12-041/source-pairs",
      countScaling: { per: 2, unit: "digivolutionCards", filter: { isSelfRef: true } },
      action: dp,
    },
  ];
}
const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const deletionWatcher = yourTurn?.actions.find((action) => action.kind === "SubTrigger");
if (deletionWatcher?.kind === "SubTrigger") {
  deletionWatcher.fireCondition = { kind: "triggerDeletedByDpZero" };
}
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && effect.isInherited === true);
const inheritedDp = inherited?.actions.find((action) => action.kind === "ModifyDP");
if (inheritedDp?.kind === "ModifyDP") {
  inheritedDp.condition = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}

const module = registerIrCard("BT12-041", compiled);

export default module;
