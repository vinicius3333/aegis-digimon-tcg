import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const myotismon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Myotismon"], match: "name" }],
};
const venomMyotismon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["VenomMyotismon"], match: "name" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
          optional: false,
          abortOnDecline: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: myotismon, count: 1 },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
            { kind: "PlaceInBattleAreaSelf" },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: myotismon,
          actions: [{ kind: "PlaceInBattleAreaSelf" }],
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: venomMyotismon, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          requiresDelayArmed: true,
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "PlaceInBattleAreaSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-098", compiled);
