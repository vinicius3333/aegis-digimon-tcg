import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-017")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  const redTamer = {
    kind: "selfDigivolutionStackMatchesFilter" as const,
    filter: { kind: ["Tamer" as const], colors: ["Red" as const] },
  };
  whenDigivolving.actions = [
    {
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
        count: 1,
      },
      condition: { kind: "not", condition: redTamer },
    },
    {
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
        count: 1,
      },
      condition: redTamer,
    },
  ];
}

export default registerIrCard("BT12-017", compiled);
