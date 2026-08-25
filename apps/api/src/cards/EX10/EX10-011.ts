// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          from: ["trash"],
          payCost: true,
          reduceCostBy: 11,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "gte",
                  value: 5,
                },
                nameOrTrait: [
                  {
                    tokens: ["Myotismon"],
                    match: "text",
                  },
                ],
              },
              count: 2,
            },
            raw: "By deleting 2 of your level 5 or higher Digimon with [Myotismon] in their texts",
          },
          raw: "play this card with the play cost reduced by 11",
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "any",
              excludeSelf: true,
              unsuspended: true,
              kind: ["Digimon"],
            },
            count: 2,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "any",
              excludeSelf: true,
              unsuspended: true,
              kind: ["Digimon"],
            },
            count: 2,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "any",
              excludeSelf: true,
              unsuspended: true,
              kind: ["Digimon"],
            },
            count: 2,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon", "Tamer"],
          },
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
            },
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestDP",
                },
                count: 1,
              },
              to: "deckBottom",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Myotismon"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

export { compiled };

registerIrCard("EX10-011", compiled);
