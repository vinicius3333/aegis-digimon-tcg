import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5851: the two [When Digivolving] [When Attacking] effects trigger simultaneously and the
// controller picks the order — two separate effect entries, each with its own once-per-turn key.
// KB Q5852-Q5855: a face-up security card is an ordinary security card that stays revealed.
// KB Q5856: "[Royal Base] in its text" matches name, traits, effects and requirements.
//
// The security placement selects its card through `SecurityManipulation.source` as a Target whose
// filter names the hand/trash zones: `runSecurityAdd`'s object-source branch reads
// `source.filter.zone` to build the loose candidate pool. `controller` is required and names the
// stack that receives the card ("as the top or bottom security card" — the controller's own).
//
// "reduce this effect's paid play cost by 1 for each of your face-up security cards" is
// `PlayFromZone.costReductionScaling`, which `runPlay` scales at resolution time; the persisted
// record's residual claiming no such primitive exists is stale.
const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, traits: ["Royal Base"], cost: 3, isAlternate: true }],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              zone: ["hand", "trash"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: 1,
            upTo: true,
          },
          amount: 1,
          faceUp: true,
          optional: true,
        },
        {
          kind: "DeleteBudget",
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          budget: 8,
          upTo: true,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
            budgetAdd: 2,
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
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              zone: ["hand", "trash"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: 1,
            upTo: true,
          },
          amount: 1,
          faceUp: true,
          optional: true,
        },
        {
          kind: "DeleteBudget",
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          budget: 8,
          upTo: true,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
            budgetAdd: 2,
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
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              zone: ["hand", "trash"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: 1,
            upTo: true,
          },
          amount: 1,
          faceUp: true,
          optional: true,
        },
        {
          kind: "DeleteBudget",
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          budget: 8,
          upTo: true,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
            budgetAdd: 2,
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
          kind: "PlayFromZone",
          target: {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          costReductionScaling: {
            per: 1,
            unit: "security",
            filter: {
              controller: "mine",
              faceUp: true,
            },
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-1",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayFromZone",
          target: {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          costReductionScaling: {
            per: 1,
            unit: "security",
            filter: {
              controller: "mine",
              faceUp: true,
            },
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-1",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-034", compiled);
