import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const bothPlayersDraw: Action[] = [
  { kind: "Draw", controller: "mine", amount: 1 },
  { kind: "Draw", controller: "opponent", amount: 1 },
];

const placeThenDraw: Action[] = [
  {
    kind: "CostGatedBlock",
    effectTextPart:
      "[When Moving] [On Play] By placing 1 card from your hand face down under any of your [Thomas H. Norstein]s, both players ＜Draw 1＞.",
    optional: true,
    abortOnDecline: true,
    cost: {
      kind: "place",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1, from: ["hand"] },
      destination: "digivolutionStack",
      position: "bottom",
      host: {
        filter: {
          controller: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "nameExact" }],
        },
        count: 1,
      },
      faceDownUnderTamer: true,
      raw: "By placing 1 card from your hand face down under any of your [Thomas H. Norstein]s",
    },
    actions: bothPlayersDraw,
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenMoving", actions: placeThenDraw },
    { trigger: "OnPlay", actions: placeThenDraw },
    { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: bothPlayersDraw },
  ],
  digivolutionRequirement: [
    { names: ["Wanyamon"], cost: 0, isAlternate: true },
    { level: 2, traits: ["DATA SQUAD"], cost: 0, isAlternate: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-019", compiled);
