import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-045")!);
const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
const revealAdd = onPlay?.actions[0];
if (revealAdd?.kind === "RevealAdd") {
  revealAdd.add[0]!.filter = { kind: ["Digimon"], colors: ["Green"] };
  revealAdd.rest = "deckBottom";
}

const module = registerIrCard("BT12-045", compiled);

export default module;
