import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-verified IR for EX3-060 (ExTyrannomon).
// The attack/block restriction is a live aura only while this Digimon has no
// digivolution cards. A structured gate keeps it synchronized as sources change.
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "restriction",
            restriction: "attack",
          },
          while: {
            kind: "selfHasNoDigivolutionCards",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "restriction",
            restriction: "block",
          },
          while: {
            kind: "selfHasNoDigivolutionCards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-060", compiled);
