import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = structuredClone(getCompiledCard("BT12-065")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
if (whenDigivolving !== undefined) {
  whenDigivolving.actions = [
    {
      kind: "GainTriggeredEffect",
      gainedTrigger: "StartOfYourMainPhase",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      duration: "untilOpponentTurnEnd",
      gainedActions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
      raw: "[Start of Your Main Phase] This Digimon attacks.",
    },
  ];
}

export default registerIrCard("BT12-065", compiled);
