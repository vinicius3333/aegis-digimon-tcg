// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// MovePermanent preserves identity, stack, links, and suspension state, matching
// Q4250/Q4251/Q4256. The breeding-area destination also supplies the empty-slot gate.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "MovePermanent",
          direction: "toBreeding",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-143", compiled);
