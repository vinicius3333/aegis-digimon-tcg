import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "Restrict", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], noDigivolutionCards: true }, count: 1 }, restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }] },
    { trigger: "Security", actions: [{ kind: "Restrict", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], noDigivolutionCards: true }, count: 1 }, restriction: "attackOrBlock", duration: "untilYourTurnEnd" }], isSecurity: true },
  ], coverage: "full", residual: [],
};
registerIrCard("ST2-14", compiled);
