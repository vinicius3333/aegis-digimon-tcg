import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-050")!);
const ownTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn" && effect.isInherited !== true);
if (ownTurn !== undefined) {
  ownTurn.actions = [
    {
      kind: "Replacement",
      event: "wouldDigivolve",
      mode: "gainMemoryOnDna",
      amount: 1,
      sourceFilter: { isSelfRef: true },
      into: { colors: ["Blue"] },
    },
  ];
}
const inherited = compiled.effects.find((effect) => effect.isInherited === true);
const aura = inherited?.actions.find((action) => action.kind === "Aura");
if (aura?.kind === "Aura") {
  aura.while = {
    kind: "anyOf",
    conditions: [
      { kind: "selfHasNameContaining", names: ["Imperialdramon"] },
      {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
      },
    ],
  };
}

export default registerIrCard("BT12-050", compiled);
