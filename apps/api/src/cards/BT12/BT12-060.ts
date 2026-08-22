import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-060")!);
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
if (inherited?.actions[0]?.kind === "Aura") {
  inherited.actions[0].while = {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  };
}

registerIrCard("BT12-060", compiled);

export default compiled;
