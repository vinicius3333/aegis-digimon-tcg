import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-034")!);
compiled.digivolutionRequirement = [{ names: ["Koromon"], cost: 0, isAlternate: true }];

const module = registerIrCard("BT12-034", compiled);

export default module;
