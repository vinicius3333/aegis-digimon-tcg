import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-112")!);
const digiXros = compiled.digiXrosRequirement?.[0];
if (digiXros !== undefined) {
  digiXros.count = "∞";
  digiXros.costReduction = 1;
}

// The generated record uses the old `filter.names` shorthand, while the executable Filter IR
// requires `nameOrTrait`. Keep the self-reducer's battle-area gate name-sensitive: otherwise any
// opposing permanent can make the optional Shoutmon payment appear payable (KB Q2249).
for (const effect of compiled.effects) {
  for (const action of effect.actions) {
    if (action.kind !== "Replacement" || action.event !== "wouldBePlayed") continue;
    for (const nested of action.actions ?? []) {
      if (nested.kind !== "SelectBind" || nested.target.filter === undefined) continue;
      const filter = nested.target.filter as typeof nested.target.filter & { names?: string[] };
      if (filter.names === undefined) continue;
      const { names, ...withoutLegacyNames } = filter;
      nested.target.filter = {
        ...withoutLegacyNames,
        controller: "mine",
        nameOrTrait: names.map((name) => ({ tokens: [name], match: "name" as const })),
      };
    }
  }
}
const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
const returnOpponentDigimon = onPlay?.actions.find(
  (action) => action.kind === "Return" && action.returnDigivolutionCardsFirst === true,
);

// The card explicitly lets its controller choose the order of the complete stack before
// putting every card at the bottom of the owner's deck.  Keep that choice in the compiled
// action rather than relying on the generated record's fixed stack order.
if (returnOpponentDigimon?.kind === "Return") returnOpponentDigimon.order = "any";

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
