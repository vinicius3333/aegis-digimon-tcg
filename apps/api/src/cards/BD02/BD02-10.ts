import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const diaboromon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }],
};

function buildPlayTokensThenBlocker(count: number): Action[] {
  return [
    { kind: "PlayToken", tokens: ["Diaboromon"], count, payCost: false, optional: true },
    {
      kind: "GainKeyword",
      target: { filter: diaboromon, count: "all" },
      keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      duration: "untilOpponentTurnEnd",
    },
  ];
}

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", zone: "battleArea", kind: ["Digimon"], colors: ["White"] },
            raw: "you have a white Digimon",
          },
        },
      ],
    },
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          costType: "use",
          mode: "reduce",
          amount: 2,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
              nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }],
            },
            raw: "you have any [Diaboromon] with digivolution cards",
          },
        },
      ],
    },
    { trigger: "Main", actions: buildPlayTokensThenBlocker(2) },
    { trigger: "Security", actions: buildPlayTokensThenBlocker(1), isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD02-10", compiled);
