import { registerIrCard } from "../../engine/effects/interpreter.js";
import { lateBt12Module } from "./_lateHandwritten.js";

const module = lateBt12Module("BT12-112");
const registered = registerIrCard("BT12-112", { effects: [], coverage: "full", residual: [] });
registered.effectsForTiming = module.effectsForTiming;
export default registered;
