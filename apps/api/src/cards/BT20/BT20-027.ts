import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4316/Q4317 defines "in its text"; Q4318/Q4319 makes the inherited
// replacement protect every matching Digimon at that timing.
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    ...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
      trigger,
      actions: [
        {
          kind: "TrashDigivolution" as const,
          target: {
            filter: {
              controller: "opponent" as const,
              kind: ["Digimon" as const],
              digivolutionCards: "hasAny" as const,
            },
            count: 1,
          },
          amount: 3,
        },
        {
          kind: "Delete" as const,
          target: {
            filter: { controller: "opponent" as const, kind: ["Digimon" as const], digivolutionCards: "none" as const },
            count: 1,
          },
        },
      ],
    })),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          raw: "When your opponent's security stack is removed from",
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          optional: true,
          affectsAll: true,
          leaveCause: "otherThanBattle",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
            },
            count: "all",
          },
          cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true }, count: 1 } },
          raw: "By suspending this Digimon, all of your [Dracomon]/[Examon]-text Digimon don't leave.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Wingdramon", "Groundramon"], cost: 3, isAlternate: true }],
};

registerIrCard("BT20-027", compiled);
