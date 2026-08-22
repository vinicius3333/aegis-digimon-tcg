import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { midBt12Module } from "./_midHandwritten.js";

const module = registerIrCard("BT12-050", { effects: [], coverage: "full", residual: [] });
const handwritten = midBt12Module("BT12-050");
module.effectsForTiming = handwritten.effectsForTiming;

export default module;
