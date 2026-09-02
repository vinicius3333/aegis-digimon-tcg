// HAND-FIXED IR for BT18-065 — do not regenerate.
// WhenDigivolving PlaceUnder: takes up to 2 Vemmon from trash under this Digimon at the bottom.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "digixrosFromTrash",
          tokens: [],
          condition: {
            kind: "youHaveNone",
            filter: {
              excludeNames: ["Vemmon"],
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            raw: "you have no Digimon other than [Vemmon]",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Vemmon"],
                  match: "name",
                },
              ],
            },
            from: ["trash"],
            count: 2,
            upTo: true,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Vemmon"],
                match: "text",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
          condition: {
            kind: "selfDigivolutionCountAtLeast",
            value: 4,
            raw: "this Digimon has 4 or more digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardReturnToDeckBottom",
          sourceFilter: {
            nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "untilOpponentTurnEnd",
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
  digiXrosRequirement: [{ materials: [{ names: ["Vemmon"] }], count: 1, maxMaterials: 4 }],
};

registerIrCard("BT18-065", compiled);
export { compiled };
