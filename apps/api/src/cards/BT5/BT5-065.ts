// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT5-065 Shademon
// ＜Blocker＞ — printed static keyword (not a runtime grant from Security trigger).
// [Security] At the end of the battle, play this card without paying its memory cost.
// [Your Turn] This Digimon can't attack.
//
// The GainKeyword Blocker inside the Security trigger was spurious — Blocker is a
// printed keyword so it belongs in a Static keywords block only.
// KB Q&A confirm the Security trigger plays the card regardless of battle outcome
// (Q1340) and after the battle ends (Q1341). The battle-ended sub-trigger is
// required because the Security timing itself resolves before a Security Digimon
// battle; it also places the replay before the next security check (Q1341).
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
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          raw: "At the end of the battle, play this card without paying its memory cost.",
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
      ],
      isSecurity: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "attack",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-065", compiled);
