import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-053")!);
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
if (inherited !== undefined) {
  inherited.trigger = "WhenBattleDeleteOpponent";
  inherited.actions = [{ kind: "GainMemory", amount: 1 }];
}

registerIrCard("BT12-053", compiled);

export default compiled;
