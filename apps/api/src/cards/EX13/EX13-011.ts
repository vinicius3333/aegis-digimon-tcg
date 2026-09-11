import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "[Mon]" is a bracketed bare name, so it is the EXACT reading (`nameExact`): the only printed
// card named "Mon" is the EX13-075 Tamer, and a substring match would wrongly accept every
// Tamer whose name merely contains "Mon" (Monica Simmons, Marcus Damon).
//
// "If you have 1 or fewer Tamers" counts Tamers the player controls, matching BT26-039 — a
// `permanentCount` condition on the action rather than a separate gate, so nothing is offered
// and no decision is raised once a second Tamer is out.
//
// The printed `[Digivolve] Lv.3 w/[Huckmon] in text: Cost 2` alternate uses `texts`, the full
// card-information union (name, types, forms, attributes and every printed effect field —
// cf. EX12-051 / KB Q6829), not an effectText-only scan. Its cost coincides with the primary
// red Lv.3 route, so the alternate only widens the legal base pool to non-red Huckmon-text
// cards such as Sistermon Blanc (Awakened).
const playMon: Action = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      nameOrTrait: [{ tokens: ["Mon"], match: "nameExact" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: false,
  optional: true,
  condition: {
    kind: "permanentCount",
    seat: "mine",
    filter: { kind: ["Tamer"] },
    op: "lte",
    value: 1,
  },
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Raid", raw: "＜Raid＞" }],
    },
    { trigger: "OnPlay", actions: [playMon] },
    { trigger: "WhenDigivolving", actions: [playMon] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, texts: ["Huckmon"], cost: 2, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-011", compiled);
