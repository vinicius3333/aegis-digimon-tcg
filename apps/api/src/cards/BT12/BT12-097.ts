import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-097")!);
const startOfMain = compiled.effects[0]?.actions[0];
if (startOfMain?.kind === "PlaceUnder") {
  delete startOfMain.underFilter;
  delete startOfMain.target.filter.keywords;
  startOfMain.condition = {
    kind: "not",
    condition: { kind: "selfDigivolutionCountAtLeast", value: 3 },
  };
}
const module = registerIrCard("BT12-097", compiled);

export default module;
