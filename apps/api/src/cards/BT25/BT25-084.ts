import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sharedActions = (gateSecurityByEffect: boolean) => {
  const actions: NonNullable<CompiledCard["effects"][number]["actions"]> = [
    {
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
      optional: true,
      abortOnDecline: true,
    },
    {
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" },
        count: "all",
      },
    },
  ];
  if (gateSecurityByEffect) {
    actions.push({
      kind: "SecurityManipulation",
      op: "trashTop",
      controller: "opponent",
      amount: 1,
      condition: { kind: "triggerEnteredByEffect" },
    });
  }
  return actions;
};

const SHARED_USE_KEY = "shared-op-wd-wa";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "hand" }, count: 2 },
            raw: "by trashing 2 cards in your hand",
          },
          raw: "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, by trashing 2 cards in your hand, it doesn't leave.",
        },
      ],
    },
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: sharedActions(true),
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: sharedActions(true),
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: sharedActions(false),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          fireCondition: { kind: "triggerHandTrashedSeat", seat: "mine" },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
                count: 1,
              },
            },
          ],
          raw: "[All Turns] When your hand is trashed from, delete 1 of your opponent's Digimon with the lowest DP.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
    { level: 5, colors: ["Red"], cost: 5, isAlternate: false },
    { level: 5, colors: ["Green"], cost: 5, isAlternate: false },
    { namesExact: ["Titamon"], baseColorCountMax: 2, cost: 2, isAlternate: true },
    { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
  ],
};

registerIrCard("BT25-084", compiled);
