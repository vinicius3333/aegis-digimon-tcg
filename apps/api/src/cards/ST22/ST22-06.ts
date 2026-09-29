import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The placement is an action rather than an activation cost: a [Once Per Turn] use is spent as
// soon as the player chooses to place (KB Q5426), and the top security card is trashed only
// when the placement actually happened (KB Q5425).
function placeLowestThenTrashTop(event: "whenOptionUsed" | "whenSecurityRemoved"): Action {
  return {
    kind: "SubTrigger",
    event,
    ...(event === "whenOptionUsed" ? { sourceFilter: { controller: "mine", kind: ["Option"] } } : {}),
    raw: "by placing 1 of your opponent's Digimon with the lowest DP as the bottom security card",
    optional: true,
    fireCondition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
    actions: [
      {
        kind: "SecurityManipulation",
        op: "addBottom",
        controller: "opponent",
        source: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        faceDown: true,
      },
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        condition: { kind: "ifThisEffectActed" },
      },
    ],
  };
}

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [placeLowestThenTrashTop("whenOptionUsed"), placeLowestThenTrashTop("whenSecurityRemoved")],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuyamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST22-06", compiled);
