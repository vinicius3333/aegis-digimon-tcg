// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] }, count: 1, scaling: { per: 1, filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] }, unit: "cards" }, },
          from: ["trash"],
          order: "any",
          position: "top",
          optional: true,
          trackCount: "bt6-086-placed",
        },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, condition: { kind: "namedCountAtLeast", countSource: "bt6-086-placed", count: 2 } },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [{ kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }, duration: "permanent", scaling: { per: 3, filter: { controllerDefault: "mine", kind: ["Digimon"] }, unit: "digivolutionCards" } }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-086", compiled);
