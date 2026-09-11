import type { Action, CompiledCard, Condition, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-010 Growlmon prints one clause under two timings ([When Moving] and [When
// Digivolving]), so both effects carry the same three actions rather than sharing a single
// trigger.
//
// "If this effect didn't delete" is the structured `ifThisEffectDidNotDelete` condition, not
// a re-read of the battle area: an immune or otherwise protected target still counts as "not
// deleted" (KB BT23-069 Q5338), and so does an empty candidate pool.
//
// "this Digimon gains <Raid> and +3000 DP" is self-referential, so both follow-up actions
// target `isSelfRef` rather than "1 of your Digimon" — unlike BT25-012/EX11-007, no selection
// decision is raised.
const didNotDelete: Condition = {
  kind: "ifThisEffectDidNotDelete",
  raw: "this effect didn't delete",
};

// Annotated as `Target` so `kind` and the `op` literal keep their union types; an unannotated
// literal widens them to `string` and the interpreter's Filter rejects it.
const deletionTarget: Target = {
  filter: {
    controller: "opponent",
    kind: ["Digimon"],
    dp: {
      op: "lte",
      value: 4000,
    },
  },
  count: 1,
};

const selfTarget: Target = {
  filter: {
    isSelfRef: true,
  },
  count: 1,
  isSelf: true,
};

// The 4000 printed maximum is the value an inherited "Add N to this Digimon's DP deletion
// effects' maximums" raises (comprehensive 15-15-4-1 adds to the value SHOWN IN TEXT), which
// is exactly what EX13-007 Guilmon in the digivolution cards does.
const clause = (): Action[] => [
  {
    kind: "Delete",
    target: deletionTarget,
  },
  {
    kind: "GainKeyword",
    target: selfTarget,
    keyword: {
      keyword: "Raid",
      raw: "＜Raid＞",
    },
    duration: "forTheTurn",
    condition: didNotDelete,
  },
  {
    kind: "ModifyDP",
    target: selfTarget,
    amount: 3000,
    duration: "forTheTurn",
    condition: didNotDelete,
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: clause(),
    },
    {
      trigger: "WhenDigivolving",
      actions: clause(),
    },
    // Same inherited wording as EX13-007 Guilmon: no "while ..." gate, so the modifier is
    // unconditional and permanent while this card sits in the digivolution cards.
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-010", compiled);
