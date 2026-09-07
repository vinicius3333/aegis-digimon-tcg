import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT25-084 (Titamon).
//
// ActivateClassesForSharedEffects with one hashValue): by trashing 1 card in hand, delete ALL of
// the opponent's highest-DP Digimon; after, IF this Digimon entered the battle area BY AN EFFECT
// (played or digivolved by an effect — never on a When Attacking entry), trash the opponent's top
// security card.
//   (a) Delete targets ALL max-DP ties — `count:"all"` (narrowToSuperlative keeps every tie).
//   (b) The wouldLeavePlay Replacement carries the "trash 2 cards from your hand" cost.
//   (c) The security clause is gated on `triggerEnteredByEffect` (the entry was BY AN EFFECT). The
//       When Attacking clause OMITS the security action entirely — a When Attacking entry can never
//       satisfy EnteredByEffect.
//   (d) The three clauses share ONE [Once Per Turn] use via `sharedUseKey` (the UseTracker keys on
//       (instanceId, effectKey); a shared key collapses them to a single per-turn limit).
//
// The `enteredByEffect` marker on the firing trigger is set by the engine seam that plays/digivolves
// this card BY AN EFFECT; a manual hard play/digivolve and the When Attacking window leave it unset,
// so the gate correctly fails there.
//
// KB Q6397-Q6401 additionally fixes the payment/event boundaries: the shared effect requires the
// full trash-1 payment; leave prevention requires both cards in one indivisible payment; a repeated
// 0-DP rule check happens before the hand-trash watcher can activate (Q6399); and that watcher fires
// once per trash action rather than once per card.

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
      // "after, if played or digivolved by an effect" — only fires when this card entered by effect.
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
          // "by trashing 2 cards in your hand, it doesn't leave" — the prevention's cost.
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
      // "[All Turns] When your hand is trashed from, delete 1 of your opponent's lowest-DP Digimon."
      // No [Once Per Turn]: fires once per trash-from-hand ACTION (KB Q6400/Q6401 — trashing 2 in one
      // action fires once; trashing 1 twice fires twice). The whenHandTrashed watcher is seat-gated to
      // THIS controller's own hand by the engine producer (primitives.trash → fireSubTrigger).
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
