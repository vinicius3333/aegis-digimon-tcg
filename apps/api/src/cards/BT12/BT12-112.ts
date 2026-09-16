import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-112")!);
const digiXros = compiled.digiXrosRequirement?.[0];
if (digiXros !== undefined) {
  digiXros.count = "∞";
  digiXros.costReduction = 1;
}

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

if (returnOpponentDigimon?.kind === "Return") returnOpponentDigimon.order = "any";

const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const securityRestriction = yourTurn?.actions.find(
  (action) => action.kind === "Restrict" && action.restriction === "activateSecurity",
);

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
