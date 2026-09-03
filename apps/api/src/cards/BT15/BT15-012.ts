import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "MaterialSave", amount: 2, raw: "＜Material Save 2＞" }],
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
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          bindResultAs: "suspendedTarget",
          optional: false,
        },
        {
          kind: "Restrict",
          target: { filter: {}, count: 1, fromSelectionRef: "suspendedTarget" },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
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
  digiXrosRequirement: [{ materials: [{ names: ["Shoutmon"] }, { names: ["Ballistamon"] }], count: 2 }],
};

registerIrCard("BT15-012", compiled);
export { compiled };
