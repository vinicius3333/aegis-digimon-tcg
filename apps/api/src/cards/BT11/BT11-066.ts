// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "Static",
    actions: [],
    keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-066", compiled);
