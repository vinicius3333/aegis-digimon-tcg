import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-055")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  const dnaCondition = { kind: "raw" as const, raw: "DNA digivolving" };
  whenDigivolving.actions = [
    {
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      condition: dnaCondition,
    },
    {
      kind: "ModifyDP",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      amount: 3000,
      duration: "forTheTurn",
      condition: dnaCondition,
    },
    {
      kind: "Attack",
      subject: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
      optional: true,
      condition: dnaCondition,
    },
  ];
}

const module = registerIrCard("BT12-055", compiled);

export default module;
