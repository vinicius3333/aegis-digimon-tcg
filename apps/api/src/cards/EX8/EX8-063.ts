import type { CardEffect, CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const fallenAngel: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  playCostLte: 7,
  nameOrTrait: [{ tokens: ["Fallen Angel"], match: "trait" }],
};
const stackGate: Condition = {
  kind: "anyOf",
  conditions: [
    {
      kind: "selfDigivolutionStackMatchesFilter",
      filter: { nameOrTrait: [{ tokens: ["Barbamon"], match: "nameExact" }] },
    },
    {
      kind: "selfDigivolutionStackHasTrait",
      filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] },
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    ...(["WhenDigivolving", "WhenAttacking"] as const).map((trigger): CardEffect => ({
      trigger,
      frequency: "OncePerTurn",
      sharedUseKey: "opponent-discard-or-fallen-angel",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [When Attacking] [Once Per Turn] Your opponent may trash 1 card in their hand.",
          kind: "Trash",
          chooser: "opponent",
          target: { controller: "opponent", filter: { zone: "hand" }, count: 1 },
          optional: true,
        },
        {
          effectTextPart:
            "If this effect didn't trash, you may play 1 [Fallen Angel] trait Digimon card with a play cost of 7 or less from your trash without paying the cost.",
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
          target: { filter: fallenAngel, count: 1 },
        },
      ],
    })),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      condition: stackGate,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          handTrashedController: "opponent",
          raw: "when cards are trashed from your opponent's hand",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Barbamon"], cost: 1, isAlternate: true }],
};

registerIrCard("EX8-063", compiled);
