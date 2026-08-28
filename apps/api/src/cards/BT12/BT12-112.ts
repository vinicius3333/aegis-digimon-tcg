import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-112")!);
const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const securityRestriction = yourTurn?.actions.find(
  (action) => action.kind === "Restrict" && action.restriction === "activateSecurity",
);

// The generated record still uses the deprecated permanent-target restriction vocabulary for
// this clause.  Security effects belong to the flipped card, not a battle-area Option permanent;
// the supported seat-scoped action is evaluated against the attacker at security-check time.
if (yourTurn !== undefined && securityRestriction !== undefined) {
  yourTurn.actions = [
    {
      kind: "DisableSecurityEffect",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      sourceKind: "option",
      scope: "seat",
      duration: "forTheTurn",
      raw: "All of your opponent's [Security] effects on Option cards don't activate.",
    },
  ];
}

const registered = registerIrCard("BT12-112", compiled);

export default registered;
