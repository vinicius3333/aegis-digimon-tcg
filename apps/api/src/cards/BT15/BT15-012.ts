// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          mode: "prevent",
          cost: {
            kind: "place",
            target: { filter: { hasDigiXrosRequirement: true }, count: 2, source: ["digivolutionCards"] },
            underFilter: { controller: "mine", kind: ["Tamer"] },
            raw: "By placing 2 DigiXros requirement cards from this Digimon's digivolution cards under 1 of your Tamers",
          },
        } as any,
      ],
    },
    {
      trigger: "StartOfYourTurn",
      actions: [
        { kind: "Delete", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
        { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed", raw: "by deleting this Digimon" } },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "suspendedTarget" },
          optional: false,
        },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "suspendedTarget" },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "digiXrosCount", minimum: 2, raw: "if DigiXrosing with 2 cards" },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Shoutmon", "Ballistamon"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-012", compiled);
export { compiled };
