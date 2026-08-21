// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    ...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
      trigger,
      actions: [
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "Raid", raw: "＜Raid＞" },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    })),
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "onAddDigivolutionCards",
        sourceFilter: { controllerDefault: "mine", kind: ["Tamer"] },
        triggerFilter: { isSelfRef: true },
        actions: [{
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
            count: 1,
          },
        }],
      }],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{
        kind: "DisableSecurityEffect",
        target: { filter: { isSelf: true }, count: 1 },
        sourceKind: "option",
        duration: "permanent",
      }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Loogarmon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("BT20-071", compiled);
