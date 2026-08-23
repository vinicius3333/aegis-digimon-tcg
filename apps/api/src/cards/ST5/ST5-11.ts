// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST5-11", compiled);
