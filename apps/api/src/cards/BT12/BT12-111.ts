import { registerIrCard } from "../../engine/effects/interpreter.js";
import { lateBt12Module } from "./_lateHandwritten.js";

const module = lateBt12Module("BT12-111");
const registered = registerIrCard("BT12-111", { effects: [], coverage: "full", residual: [] });
registered.effectsForTiming = module.effectsForTiming;

export default registered;
