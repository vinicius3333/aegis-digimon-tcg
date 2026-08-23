// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-076", compiled);
