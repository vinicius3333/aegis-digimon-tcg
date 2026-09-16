import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mamemonTextDigimonInTrash: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
};

const RETURNED_COUNT = "mamemonTextCardsReturned";

const returnThenDelete = (): Action[] => [
  {
    kind: "Return",
    target: {
      filter: mamemonTextDigimonInTrash,
      count: 3,
      upTo: true,
    },
    from: ["trash"],
    to: "deckTop",
    optional: true,
    trackCount: RETURNED_COUNT,
  },
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        playCostLte: 3,
        playCostLteScaling: { per: 1, unit: "namedCount", countSource: RETURNED_COUNT },
      },
      count: 1,
    },
  },
];

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: returnThenDelete() },
    { trigger: "OnDeletion", actions: returnThenDelete() },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Mamemon"],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-053", compiled);
