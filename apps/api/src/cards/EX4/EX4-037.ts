// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-037 — BlackMegaGargomon.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              multicolor: true,
              colorCount: 2,
              colorsAll: ["Green", "Black"],
            },
            count: 2,
          },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              multicolor: true,
              colorCount: 2,
              colorsAll: ["Green", "Black"],
            },
            count: 2,
          },
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
          sourceFilter: { kind: ["Digimon"], excludeSelf: true },
          actions: [
            { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, multicolor: true, colorCount: 2, colors: ["Green"], cost: 4, isAlternate: true },
    { level: 5, names: ["Rapidmon"], cost: 4, isAlternate: true },
  ],
};

registerIrCard("EX4-037", compiled);
