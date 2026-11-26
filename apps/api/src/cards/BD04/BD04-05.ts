import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Condition } from "@aegis/shared/effects/ir/predicates/conditions";
import { registerIrCard } from "#api/engine/effects/interpreter";

const buildLeomonOrBossCondition = (raw: string): Condition => ({
  kind: "anyOf",
  conditions: [
    { kind: "selfHasNameContaining", names: ["Leomon"] },
    { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Boss"], match: "trait" }] } },
  ],
  raw,
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          gainedTrigger: "onDeletionOf",
          gainedActions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
              suspended: true,
              condition: buildLeomonOrBossCondition("this Digimon had [Leomon] in its name or the [Boss] trait"),
            },
          ],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
          duration: "permanent",
          condition: buildLeomonOrBossCondition("this Digimon has [Leomon] in its name or the [Boss] trait"),
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD04-05", compiled);
