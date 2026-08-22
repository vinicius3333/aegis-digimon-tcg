import { registerIrCard } from "../../engine/effects/interpreter.js";
import { midBt12Module } from "./_midHandwritten.js";

const module = registerIrCard("BT12-055", { effects: [], coverage: "full", residual: [] });
module.effectsForTiming = midBt12Module("BT12-055").effectsForTiming;

export default module;
