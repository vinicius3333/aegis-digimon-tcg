// @ts-nocheck
// Hand-authored override for P-095.
// runtime-effect fix: the [Main] effect also prevents the chosen opponent Digimon from
// activating its [When Digivolving] effects until the end of the opponent's turn. The
// declarative effect record only encoded the -6000 DP. Bind the single chosen opponent Digimon
// (SelectBind), then apply both ModifyDP and DisableTimingEffect to that same target.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "P095Target",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            fromSelectionRef: "P095Target",
            count: 1,
          },
          amount: -6000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            fromSelectionRef: "P095Target",
            count: 1,
          },
          timings: ["whenDigivolving"],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -6000,
          duration: "forTheTurn",
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-095", compiled);
