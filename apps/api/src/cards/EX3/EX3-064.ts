// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trial = { controller: "mine", nameOrTrait: [{ tokens: ["Trial of the Four Great Dragons"], match: "name" }] };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["ChaosGallantmon"],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
          condition: { kind: "not", condition: { kind: "triggerPlayedByEffectSource", sourceCardId: "EX3-069" } },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
            count: 1,
          },
          condition: { kind: "triggerPlayedByEffectSource", sourceCardId: "EX3-069" },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: { filter: { ...trial, zone: "hand" }, count: 1 },
          from: ["hand"],
          optional: true,
          condition: { kind: "youHaveNone", filter: { ...trial, zone: "battleArea" } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-064", compiled);
