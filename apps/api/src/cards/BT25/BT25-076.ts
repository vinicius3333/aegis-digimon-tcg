import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-076 Ghoulmon (hand-authored override of the runtime record IR).
//
// The previously-flagged missing-primitive(sacrifice-cost-reduction) residual ("When this card
// would be played, by deleting 1 of your play cost 11-or-lower [Negamon] Digimon with [Negamon] in
// its digivolution cards, reduce this card's play cost by the DELETED Digimon's play cost") is now
// authored as a BeforePayCost effect carrying a ReducePlayCost action with a DYNAMIC delta
// (`deletedSacrificePlayCost` = the sacrificed Digimon's printed play cost). The play action fires
// this window for the in-hand card before paying, runs the OPTIONAL sacrifice SERVER-SIDE, and
// floors the dynamic delta into the cost (T-08-26: the client never supplies the delta).
//
// Source (behavior reference): documented behavior — `if (timing == EffectTiming.BeforePayCost)` selects
// one of the owner's play-cost-≤11 [Negamon]-text Digimon WITH a [Negamon] card in its
// digivolution stack, deletes it, then adds a rule implementation of −reducedCost (reducedCost =
// permanents[0].TopCard.GetCostItself). canNoSelect => optional.
//
// Shared OP/WA/OD clauses (documented behavior ActivateClassesForSharedEffects): delete 1 of the opponent's
// LOWEST-play-cost Digimon (KB Q6373 — mandatory, choose the lowest), and if this effect didn't
// delete (KB Q6374 — a deletion-immune chosen target satisfies "didn't delete"), trash the
// opponent's top security card. Rush / Reboot / Blocker are self static keywords.
export const compiled: CompiledCard = {
  effects: [
    {
      // "When this card would be played, by deleting 1 of your play cost 11 or lower Digimon with
      // [Negamon] in its digivolution cards and [Negamon] in its text, reduce the cost by the
      // deleted Digimon's play cost." (documented behavior BeforePayCost branch.)
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "sacrificePermanent",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                playCostLte: 11,
                nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
                digivolutionStackNameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
              },
              count: 1,
            },
          },
          amount: { kind: "deletedSacrificePlayCost" },
        },
      ],
    },
    // Keep the three printed keywords in one Static effect so the continuous pass applies the
    // complete keyword bundle atomically. Reboot's canonical marker also installs its
    // opponent-unsuspend behavior in the shared seam.
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Rush" },
          keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }],
          duration: "permanent",
        },
      ],
      keywords: [{ keyword: "Reboot" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      colors: ["Black"],
      cost: 3,
      isAlternate: false,
    },
  ],
};

registerIrCard("BT25-076", compiled);
