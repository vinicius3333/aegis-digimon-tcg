import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const suspendThenRestrict = (): Action[] => [
  {
    kind: "SelectBind",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        unsuspended: true,
      },
      count: 1,
      bindAs: "suspended",
    },
  },
  {
    kind: "Suspend",
    target: {
      fromSelectionRef: "suspended",
      filter: {},
      count: 1,
    },
  },
  {
    kind: "Restrict",
    target: {
      fromSelectionRef: "suspended",
      filter: {},
      count: 1,
    },
    restriction: "unsuspend",
    duration: "untilOpponentTurnEnd",
    condition: {
      kind: "selfDigivolutionStackHasTrait",
      filter: {
        nameOrTrait: [
          {
            tokens: ["DigiPolice"],
            match: "trait",
          },
        ],
      },
      raw: "a Tamer card with the [DigiPolice] trait is in this Digimon's digivolution cards",
    },
  },
];
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnPlay",
      actions: suspendThenRestrict(),
    },
    {
      trigger: "WhenDigivolving",
      actions: suspendThenRestrict(),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                  playCostLteTriggerSource: true,
                },
                count: 1,
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-058", compiled);
export { compiled };
