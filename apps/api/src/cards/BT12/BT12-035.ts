import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-035")!);
const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && effect.isInherited === true);
const dp = inherited?.actions.find((action) => action.kind === "ModifyDP");
if (dp?.kind === "ModifyDP") {
  dp.condition = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}

const module = registerIrCard("BT12-035", compiled);

export default module;
