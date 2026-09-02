import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the play cost by 2",
              condition: {
                kind: "youHaveNone",
                // The printed "you have no Digimon" is the battle-area default (§15-1-7;
                // breeding is a separate area and must not block this reduction).
                filter: { controllerDefault: "mine", zone: "battleArea", kind: ["Digimon"] },
                raw: "you have no Digimon",
              },
            },
          ],
          scaling: { per: 5, filter: { controller: "any", zone: "trash" }, unit: "cards" },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 6000 },
            },
            count: 1,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "gte", value: 13000 },
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no opponent's Digimon was deleted by this effect",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 6000 },
            },
            count: 1,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "gte", value: 13000 },
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no opponent's Digimon was deleted by this effect",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 6000 },
            },
            count: 1,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "gte", value: 13000 },
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no opponent's Digimon was deleted by this effect",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-111", compiled);
