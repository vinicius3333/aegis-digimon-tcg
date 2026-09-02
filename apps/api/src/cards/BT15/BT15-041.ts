import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon: Target = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", target: opponentDigimon, amount: -6000, duration: "untilOpponentTurnEnd" }],
    },
    {
      trigger: "OnDeletion",
      actions: [{ kind: "ModifyDP", target: opponentDigimon, amount: -6000, duration: "untilOpponentTurnEnd" }],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              bindResultAs: "played",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    { tokens: ["Rosemon"], match: "name" },
                    { tokens: ["Jijimon"], match: "name" },
                  ],
                },
                count: 1,
              },
            },
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              target: { filter: { boundRef: "played" }, count: 1 },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT15-041", compiled);
