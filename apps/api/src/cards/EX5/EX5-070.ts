// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-070")!;
export const compiled: CompiledCard = structuredClone(generated);
const main = compiled.effects.find((effect) => effect.trigger === "Main");
const digivolve = main?.actions.find((action) => action.kind === "Digivolve");
if (digivolve?.kind === "Digivolve") {
  // The printed target is a Digimon *without* [X Antibody] in its digivolution cards.
  // `nameOrTrait` tests the top card and the generated record therefore selected the inverse.
  digivolve.target.filter.nameOrTrait = undefined;
  digivolve.target.filter.digivolutionStackNameOrTrait = [{ tokens: ["X Antibody"], match: "nameExact", negate: true }];
  digivolve.payCost = true;
  digivolve.bindResultAs = "ex5-070-digivolved";
  const placeUnder = main?.actions.find((action) => action.kind === "PlaceUnder");
  if (placeUnder?.kind === "PlaceUnder") {
    // Place Proto Form only after the preceding effect-driven digivolve succeeds.
    placeUnder.condition = { kind: "ifThisEffectDigivolved" };
    placeUnder.target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
    placeUnder.position = "bottom";
    placeUnder.underFilter = { controller: "mine", boundRef: "ex5-070-digivolved" };
  }
}
if (!compiled.effects.some((effect) => effect.trigger === "Rule")) {
  compiled.effects.push({
    trigger: "Rule",
    actions: [
      {
        kind: "GrantStatic",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        grant: "name",
        tokens: ["X Antibody"],
      },
    ],
  });
}
const inherited = compiled.effects.find((effect) => effect.trigger === "AllTurns");
const replacement = inherited?.actions.find((action) => action.kind === "Replacement");
if (replacement?.kind === "Replacement") {
  replacement.leaveCause = "otherThanYourEffect";
  replacement.actions = [
    {
      kind: "Return",
      target: {
        filter: { zone: "digivolutionCards", controller: "mine", kind: ["Digimon"], hostFilter: { isSelfRef: true } },
        count: 1,
      },
      to: "hand",
    },
    {
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      source: {
        filter: {
          zone: "digivolutionCards",
          controller: "mine",
          hostFilter: { isSelfRef: true },
          // [X Antibody] is a named card reference here, not the broad [X Antibody] trait.
          nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }],
        },
      },
      amount: 1,
      faceDown: true,
    },
  ];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-070", compiled);
