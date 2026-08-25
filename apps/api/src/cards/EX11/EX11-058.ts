import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const aquaOrSeaAnimal: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Aqua"], match: "trait" },
    { tokens: ["Sea Animal"], match: "trait", orPrevious: true },
  ],
};
const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer",
} as const;
const draw: Action = {
  kind: "Draw",
  controller: "mine",
  amount: 1,
  cost: suspendCost,
  optional: true,
  abortOnDecline: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: { ...aquaOrSeaAnimal, levelComparison: { op: "lte", value: 5 }, zone: "hand" },
              count: 1,
              from: ["hand"],
            },
            underFilter: aquaOrSeaAnimal,
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            raw: "By placing 1 level 5 or lower card with [Aqua] or [Sea Animal] in any of its traits from your hand as the bottom digivolution card of any of your [Aqua] or [Sea Animal] Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: aquaOrSeaAnimal,
          actions: [
            draw,
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
              condition: { kind: "triggerPlayedByDecode", raw: "played by ＜Decode＞" },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: aquaOrSeaAnimal,
          actions: [draw],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-058", compiled);
