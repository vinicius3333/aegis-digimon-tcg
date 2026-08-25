import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-029")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const unsuspend = whenDigivolving?.actions.find((action) => action.kind === "Unsuspend");
if (unsuspend?.kind === "Unsuspend") {
  unsuspend.target = {
    filter: { isSelfRef: true },
    orFilters: [{ controller: "mine", kind: ["Tamer"], colors: ["Blue"] }],
    count: 1,
  };
}
const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
const watcher = allTurns?.actions.find((action) => action.kind === "SubTrigger");
const returned = watcher?.kind === "SubTrigger" ? watcher.actions.find((action) => action.kind === "Return") : undefined;
if (returned?.kind === "Return") {
  returned.condition = {
    kind: "anyOf",
    conditions: [
      { kind: "youHave", filter: { zone: "battleArea", kind: ["Tamer"], colors: ["Blue"] } },
      {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: { nameOrTrait: [{ tokens: ["UlforceVeedramon"], match: "name" }] },
      },
    ],
  };
}

const module = registerIrCard("BT12-029", compiled);

export default module;
