import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = structuredClone(getCompiledCard("BT12-084")!);

compiled.digiXrosRequirement = [
  {
    materials: [{ names: ["Mervamon"] }, { names: ["Sparrowmon"] }],
    count: 3,
  },
];

const sparrowmonStack = {
  kind: "selfDigivolutionStackMatchesFilter" as const,
  filter: {
    nameOrTrait: [{ tokens: ["Sparrowmon"], match: "name" as const }],
  },
};

for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
  const effect = compiled.effects.find((candidate) => candidate.trigger === trigger);
  const placement = effect?.actions[0];
  if (placement?.kind === "PlaceUnder") {
    placement.underFilter = undefined;
    placement.effectTextPart =
      "[On Play][When Digivolving] You may place 1 Digimon card with a [Xros Heart] trait from your hand or from under one of your Tamers under this Digimon as its bottom digivolution card.";
  }
  if (effect !== undefined) {
    effect.actions[1] = {
      effectTextPart:
        "Then, if this Digimon has [Sparrowmon] in its digivolution cards, until the end of your opponent's turn, all of your Digimon gain ＜Blocker＞ and can't be returned to hands or decks.",
      kind: "ConditionalBranch",
      condition: sparrowmonStack,
      ifTrue: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "endOfOpponentTurn",
          includeLaterEntrants: true,
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          restriction: "cannotReturnToHandOrDeck",
          duration: "endOfOpponentTurn",
          whileMatchesTargetFilter: true,
        },
      ],
    };
  }
}

const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
const deletionWatcher = allTurns?.actions.find((action) => action.kind === "SubTrigger");
if (deletionWatcher?.kind === "SubTrigger") {
  deletionWatcher.sourceFilter = { excludeSelf: true };
  deletionWatcher.fireCondition = { kind: "triggerDeletedIsYourOther" };
}

export default registerIrCard("BT12-084", compiled);
