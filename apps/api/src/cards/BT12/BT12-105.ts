import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-105")!);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const grantDeletionEffect = main?.actions[0];
if (grantDeletionEffect?.kind === "GrantAuraToOpponents") {
  grantDeletionEffect.effectTextPart =
    "[Main] Until the end of your opponent's turn, 1 of your opponent's Digimon gains \"[On Deletion] Trash the top card of your security stack.\"";
}
const playFreeDigimon = main?.actions[1];
if (playFreeDigimon?.kind === "PlayWithoutCost") {
  playFreeDigimon.effectTextPart =
    "Then, if you have a blue Digimon in play, you may play 1 green level 4 or lower Digimon card with a [Free] trait from your hand without paying its cost.";
}

registerIrCard("BT12-105", compiled);

export default compiled;
