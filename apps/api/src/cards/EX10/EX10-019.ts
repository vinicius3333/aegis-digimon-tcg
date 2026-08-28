// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              cost: {
                kind: "trash",
                target: {
                  filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true },
                  count: 1,
                },
                raw: "By trashing 1 of this Digimon's link cards",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
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
              or: [{ zone: "trash" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["trash", "digivolutionCards"],
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
              or: [{ zone: "trash" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["trash", "digivolutionCards"],
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
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
                bindAs: "warudamonTarget",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Suspend",
              target: {
                filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
                count: 1,
                fromSelectionRef: "warudamonTarget",
              },
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
                fromSelectionRef: "warudamonTarget",
              },
              restriction: "unsuspend",
              duration: "untilOpponentNextUnsuspendPhase",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Mienumon", "Sakusimon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

export { compiled };

registerIrCard("EX10-019", compiled);
