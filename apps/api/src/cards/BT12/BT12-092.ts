import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-092")!);
const startOfMain = compiled.effects[0];
if (startOfMain !== undefined) {
  const costAction = startOfMain.actions.find((action) => action.kind === "GrantStatic");
  if (costAction !== undefined) costAction.cost = { kind: "payMemory", memory: 1 };
  startOfMain.actions = startOfMain.actions.filter((action) => action.kind !== "CostModifier");
}
const module = registerIrCard("BT12-092", compiled);

export default module;
