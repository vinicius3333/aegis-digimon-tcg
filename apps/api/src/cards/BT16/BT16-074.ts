import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT16-074 Climbmon. Q2661 requires both security branches at exactly 3;
// Q5532 binds the played Digimon to the next opponent-turn-end deletion.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: { kind: "securityAtLeast", value: 3 },
        },
        {
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
          condition: { kind: "securityAtLeast", value: 3 },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: { op: "lte", value: 6000 },
              nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: { kind: "securityAtMost", value: 3 },
          optional: true,
        },
        { kind: "DelayedDelete", timing: "endOfOpponentTurn" },
      ],
    },
    {
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            raw: "this Digimon has [Pulsemon] in its text",
          },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            raw: "by trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true }],
};

registerIrCard("BT16-074", compiled);
