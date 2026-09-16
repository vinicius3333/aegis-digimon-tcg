import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const allianceKeyword = { keyword: "Alliance", raw: "＜Alliance＞" } as const;

const playableBeast: Filter = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Digimon"],
  playCostLte: 4,
  nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
};

const playBeastFromHand = (): Action => ({
  kind: "PlayWithoutCost",
  target: { filter: playableBeast, count: 1 },
  from: ["hand"],
  payCost: false,
  optional: true,
});

const SHARED_USE_KEY = "EX13-042/play-beast";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [allianceKeyword] },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: [playBeastFromHand()],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: [playBeastFromHand()],
    },
    { trigger: "Static", actions: [], isInherited: true, keywords: [allianceKeyword] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-042", compiled);
