import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Start of Your Main Phase] 1 of your Digimon or Tamers may digivolve into a
// Hybrid/Hero trait Digimon in hand. For each of your red Tamers with DIFFERENT NAMES,
// reduce this effect's digivolution cost by 1.
// KB Q4595: If only this card is in battle area, cost is reduced by 1 (counts itself).
// [Your Turn] (inherited): when security removed, may play 1 red Tamer from hand free.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
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
          payCost: false,
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Hybrid", "Hero"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          // Printed text has no "ignoring digivolution requirements" clause and it pays the
          // (reduced) digivolution cost, so this is a paid digivolve: the chosen base must
          // still satisfy the target Hybrid's digivolution requirement (level/name). payCost
          // drives enforceRequirements in runDigivolve — without it the gate is skipped and
          // any base could evolve into any Hybrid/Hero.
          payCost: true,
          optional: true,
          // documented behavior passes reduceCostTuple straight into DigivolveIntoHandOrTrashCard, so the
          // reduction belongs to THIS digivolve. Modelling it as a sibling `wouldDigivolve`
          // replacement (the previous encoding) installed a modifier that could never reach
          // the digivolve in the same action list, so the full cost was always charged.
          reduceCostScaling: {
            per: 1,
            unit: "distinctNames",
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Red"],
            },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          raw: "when your opponent's security stack is removed from, you may play 1 red Tamer card from your hand without paying the cost",
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "opponent",
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Tamer"],
                  colors: ["Red"],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
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

registerIrCard("BT21-082", compiled);
