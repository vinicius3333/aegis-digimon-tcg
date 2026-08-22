import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine", levels: [5], nameOrTrait: [{ tokens: ["Cyborg"], match: "trait" }] }, count: 1 }, raw: "By trashing 1 level 5 card with [Cyborg] in its traits in your hand" },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "Draw", controller: "mine", amount: 1, optional: true, abortOnDecline: true },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: { filter: { controller: "mine", kind: ["Digimon"], levels: [6], nameOrTrait: [{ tokens: ["Machine"], match: "trait" }] }, count: 1 },
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "by suspending this Tamer" },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-092", compiled);
