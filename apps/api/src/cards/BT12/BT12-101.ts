import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { lateBt12Module } from "./_lateHandwritten.js";

const compiled = structuredClone(getCompiledCard("BT12-101")!);
const module = registerIrCard("BT12-101", compiled);
const compiledEffectsForTiming = module.effectsForTiming.bind(module);
const handwritten = lateBt12Module("BT12-101");

module.effectsForTiming = (timing: EffectTiming, source: CardSource) => {
  const effects = handwritten.effectsForTiming(timing, source);
  return effects.length > 0 ? effects : compiledEffectsForTiming(timing, source);
};

export default module;
