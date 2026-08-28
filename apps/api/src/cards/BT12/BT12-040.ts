import { getCompiledCard, type Condition } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-040")!);
const cost = compiled.effects.find((effect) => effect.trigger === "Static");
if (cost !== undefined) {
  cost.trigger = "BeforePayCost";
  cost.keywords = [];
  const condition: Condition = {
    kind: "opponentHas" as const,
    filter: { kind: ["Digimon"], keywords: ["SecurityAttack"] },
  };
  cost.condition = condition;
  cost.actions = [
    {
      kind: "ReducePlayCost",
      payment: {
        kind: "automatic",
        condition,
      },
      amount: { kind: "fixed", value: 3 },
    },
  ];
}

registerIrCard("BT12-040", compiled);

export default compiled;
