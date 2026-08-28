// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          leaveCount: 3,
          upTo: true,
          trackCount: "securityTrashed",
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "securityTrashed",
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "for each security card you trashed",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
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
            kind: "keyword",
            keyword: {
              keyword: "Jamming",
              raw: "＜Jamming＞",
            },
          },
          while: {
            kind: "allOf",
            conditions: [
              { kind: "securityAtLeast", value: 3 },
              { kind: "securityAtMost", value: 3 },
            ],
            raw: "while you have 3 security cards",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-033", compiled);
