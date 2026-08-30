import { registerIrCard } from "../../engine/effects/interpreter.js";
import { lateBt12Module } from "./_lateHandwritten.js";

const late = lateBt12Module("BT12-095");
const module = registerIrCard("BT12-095", { effects: [], coverage: "full", residual: [] });
module.effectsForTiming = late.effectsForTiming;
Object.assign(module, { declaredTriggers: late.declaredTriggers });

export default module;
