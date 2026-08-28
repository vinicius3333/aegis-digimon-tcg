// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isLinked: true,
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Appmon"] }],
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true }, count: 1 },
            raw: "By trashing 1 of this Digimon's link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -8000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "trash",
                target: {
                  filter: { isSelfRef: true, zone: "linked" },
                  count: 1,
                },
                raw: "by trashing 1 of its link cards",
              },
              optional: true,
              abortOnDecline: true,
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
  appFusionRequirement: [
    {
      names: ["Warpmon", "Weatherdramon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

export { compiled };

registerIrCard("EX10-030", compiled);
