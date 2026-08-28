import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-068")!);
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const aura = inherited?.actions.find((action) => action.kind === "Aura");
if (aura?.kind === "Aura") {
  aura.while = {
    kind: "anyOf",
    conditions: [
      { kind: "selfHasNameContaining", names: ["Greymon"] },
      { kind: "selfHasNameContaining", names: ["Omnimon"] },
    ],
  };
}

export default registerIrCard("BT12-068", compiled);
