import { registerIrCard } from "../../engine/effects/interpreter.js";
import { lateBt12Module } from "./_lateHandwritten.js";

const module = registerIrCard("BT12-095", { effects: [], coverage: "full", residual: [] });
module.effectsForTiming = lateBt12Module("BT12-095").effectsForTiming;

export default module;
