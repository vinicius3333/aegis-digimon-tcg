import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-104")!);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const playMarcus = main?.actions[0];
if (playMarcus?.kind === "PlayWithoutCost") {
  playMarcus.effectTextPart = "[Main] You may play 1 [Marcus Damon] card from your hand without paying its cost.";
}
const minusDp = main?.actions[1];
if (minusDp?.kind === "ModifyDP") {
  minusDp.effectTextPart =
    "Then, for each yellow or red Tamer you have in play, 3 of your opponent's Digimon get -2000 DP for the turn.";
}

registerIrCard("BT12-104", compiled);

export default compiled;
