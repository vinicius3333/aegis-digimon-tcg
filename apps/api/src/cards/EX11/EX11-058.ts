import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// CR 2-3-2-4: "[Aqua] or [Sea Animal] in any of its traits" matches every trait that CONTAINS
// the bracketed text, not the trait spelled exactly. No card carries a bare [Aqua] trait — the
// real traits are [Aquatic], [Aquabeast] and [Ancient Aquabeast] — so an exact match made the
// whole Aqua half of this card dead, while [Sea Beast] must still stay out.
const aquaOrSeaAnimalTraits = [
  { tokens: ["Aqua"], match: "traitContains" as const },
  { tokens: ["Sea Animal"], match: "traitContains" as const, orPrevious: true },
];
const aquaOrSeaAnimal: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: aquaOrSeaAnimalTraits,
};
// The placement pays with "1 level 5 or lower CARD", not a Digimon card: any levelled card in
// hand with a matching trait qualifies.
const placeableAquaOrSeaAnimalCard: Filter = {
  controller: "mine",
  nameOrTrait: aquaOrSeaAnimalTraits,
};
const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer",
} as const;
const draw: Action = {
  kind: "Draw",
  controller: "mine",
  amount: 1,
  cost: suspendCost,
  optional: true,
  abortOnDecline: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                ...placeableAquaOrSeaAnimalCard,
                levelComparison: { op: "lte", value: 5 },
                zone: "hand",
              },
              count: 1,
              from: ["hand"],
            },
            underFilter: aquaOrSeaAnimal,
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            raw: "By placing 1 level 5 or lower card with [Aqua] or [Sea Animal] in any of its traits from your hand as the bottom digivolution card of any of your [Aqua] or [Sea Animal] Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: aquaOrSeaAnimal,
          actions: [
            draw,
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
              condition: { kind: "triggerPlayedByDecode", raw: "played by ＜Decode＞" },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: aquaOrSeaAnimal,
          actions: [draw],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-058", compiled);
