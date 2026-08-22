// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const bloom = { controllerDefault: "mine", kind: ["Digimon"], suspended: true, nameOrTrait: [{ tokens: ["Vegetation", "Plant", "Fairy"], match: "trait" }] };
const suspendedDigimon = { controllerDefault: "mine", kind: ["Digimon"], suspended: true };
const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Suspend", target: { filter: { controller: "mine", kind: ["Digimon"], unsuspended: true }, count: 1 }, optional: true },
        { kind: "GainMemory", amount: 1, scaling: { per: 1, unit: "cards", filter: bloom } },
        {
          kind: "ConditionalBranch",
          condition: { kind: "permanentCount", op: "gte", value: 2, filter: bloom },
          ifTrue: [
            { kind: "Unsuspend", target: self },
            { kind: "GainKeyword", target: self, keyword: { keyword: "Piercing" }, duration: "forTheTurn" },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        { kind: "ModifyDP", target: self, amount: 2000, duration: "untilEachTurnEnd", scaling: { per: 2, unit: "cards", filter: suspendedDigimon } },
        { kind: "GainKeyword", target: self, keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilEachTurnEnd", scaling: { per: 2, unit: "cards", filter: suspendedDigimon } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-057", compiled);
