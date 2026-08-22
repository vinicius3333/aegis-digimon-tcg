import { registerIrCard } from "../../engine/effects/interpreter.js";
import { midBt12Module } from "./_midHandwritten.js";

const module = midBt12Module("BT12-019");
const registered = registerIrCard("BT12-019", { effects: [], coverage: "full", residual: [] });
registered.effectsForTiming = module.effectsForTiming;
export default registered;
