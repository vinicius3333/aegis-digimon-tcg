import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-031")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const bottomDeck = whenDigivolving?.actions.find((action) => action.kind === "Return" && action.to === "deckBottom");
const returnToHand = whenDigivolving?.actions.find((action) => action.kind === "Return" && action.to === "hand");
if (bottomDeck?.kind === "Return") {
  bottomDeck.target.count = "all";
  bottomDeck.cost = {
    kind: "return",
    target: {
      filter: {
        zone: "digivolutionCards",
        hostFilter: { isSelfRef: true },
        nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }],
      },
      count: 1,
    },
    to: "hand",
    raw: "By returning 1 [Imperialdramon: Dragon Mode] card from this Digimon's digivolution cards to its owner's hand",
  };
  bottomDeck.optional = true;
  bottomDeck.abortOnDecline = false;
}
if (returnToHand?.kind === "Return") {
  returnToHand.condition = {
    kind: "anyOf",
    conditions: [
      {
        kind: "not",
        condition: {
          kind: "selfDigivolutionStackMatchesFilter",
          filter: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }] },
        },
      },
      { kind: "ifThisEffectDidNotAct" },
    ],
  };
}
const suspendAll = whenDigivolving?.actions.find((action) => action.kind === "Suspend");
if (suspendAll?.kind === "Suspend") {
  suspendAll.effectTextPart = "[When Digivolving] Suspend all of your opponent's Digimon with no digivolution cards.";
}
const returnClause =
  "Then, return 1 of your opponent's suspended Digimon to its owner's hand. By returning 1 [Imperialdramon: Dragon Mode] card from this Digimon's digivolution cards to its owner's hand, place all of your opponent's suspended Digimon at the bottom of their owners' decks instead.";
if (bottomDeck?.kind === "Return") bottomDeck.effectTextPart = returnClause;
if (returnToHand?.kind === "Return") returnToHand.effectTextPart = returnClause;
if (whenDigivolving !== undefined && bottomDeck !== undefined && returnToHand !== undefined) {
  whenDigivolving.actions = [
    ...whenDigivolving.actions.filter((action) => action !== bottomDeck && action !== returnToHand),
    bottomDeck,
    returnToHand,
  ];
}
const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
const dp = allTurns?.actions.find((action) => action.kind === "ModifyDP");
if (dp?.kind === "ModifyDP" && dp.scaling !== undefined) dp.scaling.unit = "digivolutionCardColors";
for (const aura of allTurns?.actions.filter((action) => action.kind === "Aura") ?? []) {
  if (aura.kind === "Aura") {
    aura.while = { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 2 };
  }
}

const module = registerIrCard("BT12-031", compiled);

export default module;
