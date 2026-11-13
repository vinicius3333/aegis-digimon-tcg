import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Condition } from "@aegis/shared/effects/ir/predicates/conditions";
import { registerIrCard } from "#api/engine/effects/interpreter";

const hostHasGemmonInText: Condition = {
  kind: "selfTopHasText",
  filter: { nameOrTrait: [{ tokens: ["Gemmon"], match: "text" }] },
  raw: "this Digimon has [Gemmon] in its text",
};

const boostThenSecurityAttack: Action[] = [
  {
    kind: "ModifyDP",
    effectTextPart: "1 of your Digimon gets +3000 DP for the turn.",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    amount: 3000,
    duration: "forTheTurn",
  },
  {
    kind: "GainKeyword",
    effectTextPart: "Then, if that Digimon has 12000 DP or more, it also gains ＜Security A. +1＞.",
    target: { filter: { controllerDefault: "mine" }, count: 1, sameTarget: true },
    keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
    duration: "forTheTurn",
    condition: { kind: "lastTargetDpAtLeast", value: 12000 },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Engage", raw: "＜Engage＞" }] },
    { trigger: "OnPlay", actions: boostThenSecurityAttack },
    { trigger: "WhenDigivolving", actions: boostThenSecurityAttack },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Engage", raw: "＜Engage＞" },
          duration: "permanent",
          condition: hostHasGemmonInText,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      isInherited: true,
      condition: hostHasGemmonInText,
      description: "＜Engage＞: at the end of this turn, this Digimon may attack.",
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, texts: ["Gemmon"], cost: 3, isAlternate: true }],
};

registerIrCard("ST25-04", compiled);
