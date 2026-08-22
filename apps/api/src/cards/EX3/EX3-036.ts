// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trialFilter = {
  controller: "mine",
  nameOrTrait: [{ tokens: ["Trial of the Four Great Dragons"], match: "name" }],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "not", condition: { kind: "triggerPlayedByEffectSource", sourceCardId: "EX3-069" } },
        },
        {
          kind: "GainKeyword",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "SecurityAttack", amount: -2, raw: "＜Security Attack -2＞" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "triggerPlayedByEffectSource", sourceCardId: "EX3-069" },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: { filter: { ...trialFilter, zone: "hand" }, count: 1 },
          from: ["hand"],
          optional: true,
          condition: { kind: "youHaveNone", filter: { ...trialFilter, zone: "battleArea" } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-036", compiled);
