// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{
        kind: "Aura",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
        while: { kind: "raw", raw: "this Digimon has [Imperialdramon] in its name or [Free] in its traits" },
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-038", compiled);
