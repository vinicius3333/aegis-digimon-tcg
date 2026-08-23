// @ts-nocheck
// HAND-FIXED — generator must preserve this file (was AUTO-GENERATED FROM IR).
// Fix 1: Suspend+Restrict payload moved from [Hand]/[Counter] to WhenDigivolving
//   (KB Q828-Q830: it is this card's WHEN DIGIVOLVING effect).
// Fix 2: "[When Digivolving][End of Attack][Once Per Turn] You may unsuspend this Digimon"
//   is ONE effect with two trigger windows sharing a single once-per-turn limit.
//   Two effects with separate OncePerTurn would allow two unsuspensions per turn.
//   Use sharedUseKey:"ir-shared-0" on both to enforce a shared limit.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "Hand",
      actions: [],
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "Counter",
      actions: [],
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Rapidmon"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST17-08", compiled);
