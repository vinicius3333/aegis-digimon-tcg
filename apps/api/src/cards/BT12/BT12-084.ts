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
  if (placement?.kind === "PlaceUnder") placement.underFilter = undefined;
  if (effect !== undefined) {
    effect.actions[1] = {
      kind: "ConditionalBranch",
      condition: sparrowmonStack,
      ifTrue: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "endOfOpponentTurn",
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          restriction: "cannotReturnToHandOrDeck",
          duration: "endOfOpponentTurn",
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
