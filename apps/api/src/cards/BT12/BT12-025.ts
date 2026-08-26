import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-025")!);
compiled.digivolutionRequirement = [
  { names: ["Lanamon"], cost: 1, isAlternate: true },
  { cost: 0, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] },
];

const module = registerIrCard("BT12-025", compiled);

export default module;
