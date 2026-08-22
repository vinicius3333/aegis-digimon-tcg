// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const greenBlack = { controller: "mine", kind: ["Digimon"], colors: ["Green", "Black"] };
const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: greenBlack, count: 2 },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: { filter: greenBlack, count: 2 },
          keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "Unsuspend", target: self, optional: true }],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, names: ["Rapidmon"], cost: 4, isAlternate: true },
    { level: 5, multicolor: true, colors: ["Green"], cost: 4, isAlternate: true },
  ],
};

registerIrCard("EX4-037", compiled);
export default compiled;
