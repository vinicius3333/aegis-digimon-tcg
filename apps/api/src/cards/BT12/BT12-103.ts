import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-103")!);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const minusDp = main?.actions[0];
if (minusDp?.kind === "ModifyDP") {
  minusDp.effectTextPart = "[Main] 1 of your opponent's Digimon gets -4000 DP for the turn.";
}
const securityAttackReduction = main?.actions[1];
if (securityAttackReduction?.kind === "GainKeyword") {
  securityAttackReduction.effectTextPart =
    "Then, if you have a Digimon with 4 or more digivolution cards in play, 1 of your opponent's Digimon gains ＜Security Attack -1＞ for the turn. (This Digimon checks 1 fewer security cards.)";
}
if (securityAttackReduction !== undefined) {
  securityAttackReduction.condition = {
    kind: "youHave",
    filter: {
      zone: "battleArea",
      controllerDefault: "mine",
      kind: ["Digimon"],
      digivolutionCardsAtLeast: 4,
    },
    raw: "you have a Digimon with 4 or more digivolution cards in play",
  };
}

registerIrCard("BT12-103", compiled);

export default compiled;
