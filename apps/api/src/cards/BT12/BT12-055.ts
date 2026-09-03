import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-055")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  const dnaCondition = { kind: "isDnaDigivolving" as const };
  whenDigivolving.actions = whenDigivolving.actions.filter(
    (action) =>
      !(
        action.kind === "ModifyDP" &&
        action.target.isSelf === true &&
        action.target.filter.isSelfRef === true &&
        action.amount === 3000 &&
        action.condition?.kind === "isDnaDigivolving"
      ),
  );
  const suspend = whenDigivolving.actions.find((action) => action.kind === "Suspend");
  if (suspend?.kind === "Suspend") suspend.condition = dnaCondition;
  const attackIndex = whenDigivolving.actions.findIndex((action) => action.kind === "Attack");
  whenDigivolving.actions.splice(attackIndex < 0 ? whenDigivolving.actions.length : attackIndex, 0, {
    kind: "ModifyDP",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    amount: 3000,
    duration: "forTheTurn",
    condition: dnaCondition,
  });
}
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const watcher = inherited?.actions.find((action) => action.kind === "SubTrigger");
if (watcher?.kind === "SubTrigger") {
  watcher.sourceFilter = {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["Imperialdramon"], match: "name" },
      { tokens: ["Free"], match: "trait" },
    ],
  };
}

export default registerIrCard("BT12-055", compiled);
