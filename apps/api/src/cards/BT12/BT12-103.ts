import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-103")!);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const securityAttackReduction = main?.actions[1];
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
