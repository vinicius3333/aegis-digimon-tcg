import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = structuredClone(getCompiledCard("BT12-065")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  whenDigivolving.actions = [
    {
      kind: "SubTrigger",
      event: "startOfYourMainPhase",
      on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      duration: "untilOpponentTurnEnd",
      actions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
      raw: "give 1 opposing Digimon '[Start of Your Main Phase] Attack with this Digimon' until its turn ends",
    },
  ];
}

export default registerIrCard("BT12-065", compiled);
