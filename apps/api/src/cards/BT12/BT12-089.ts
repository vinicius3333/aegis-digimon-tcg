import { registerIrCard } from "../../engine/effects/interpreter.js";
import { lateBt12Module } from "./_lateHandwritten.js";

const late = lateBt12Module("BT12-089");
const module = registerIrCard("BT12-089", { effects: [], coverage: "full", residual: [] });
module.effectsForTiming = late.effectsForTiming;
Object.assign(module, { declaredTriggers: late.declaredTriggers });

export default module;
