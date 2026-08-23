// @ts-nocheck
// HAND-FIXED IR for BT2-051 (RustTyrannomon) — do not regenerate over this file.
// The generated GrantCanAttackUnsuspended dropped the "[Your Turn] When you have a
// green Tamer in play" gate; it is restored as a structured youHave condition.
// The whenDeletesInBattle subtrigger's "and survives" qualifier needs no IR field:
// the engine fires that event only when the attacker survived and the defender was
// deleted (combat/controller.ts — not a both-die tie).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Green"],
            },
            raw: "you have a green Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-051", compiled);
