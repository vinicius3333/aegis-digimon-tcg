import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const playKanataHondo: Action = {
  kind: "PlayWithoutCost",
  effectTextPart:
    "If you have 1 or fewer Tamers, you may play 1 [Kanata Hondo] from your hand without paying the cost.",
  target: {
    filter: { controller: "mine", nameOrTrait: [{ tokens: ["Kanata Hondo"], match: "nameExact" }] },
    count: 1,
  },
  from: ["hand"],
  payCost: false,
  condition: {
    kind: "youHave",
    filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 },
    raw: "you have 1 or fewer Tamers",
  },
  optional: true,
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [playKanataHondo] },
    { trigger: "WhenDigivolving", actions: [playKanataHondo] },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, texts: ["Gemmon"], cost: 2, isAlternate: true }],
};

registerIrCard("ST25-03", compiled);
