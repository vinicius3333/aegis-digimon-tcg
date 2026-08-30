import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-106")!);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const restrict = main?.actions.find((action) => action.kind === "Restrict");
if (restrict?.kind === "Restrict" && restrict.target.count === "all") {
  (restrict as typeof restrict & { whileMatchesTargetFilter: boolean }).whileMatchesTargetFilter = true;
}

const registered = registerIrCard("BT12-106", compiled);

export default registered;
