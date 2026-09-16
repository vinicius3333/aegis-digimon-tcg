import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-072")!;
export const compiled: CompiledCard = structuredClone(generated);

const staticEffect = compiled.effects.find((effect) => effect.trigger === "Static");
const waiver = staticEffect?.actions.find((action) => action.kind === "WaiveColorRequirement");
if (staticEffect !== undefined && waiver !== undefined && staticEffect.actions.length > 1) {
  staticEffect.actions = staticEffect.actions.filter((action) => action !== waiver);
  compiled.effects.unshift({ trigger: "Static", actions: [waiver] });
}

const reduction = compiled.effects
  .flatMap((effect) => effect.actions)
  .find((action) => action.kind === "ReducePlayCost");
if (reduction?.kind === "ReducePlayCost" && reduction.scaling !== undefined && reduction.amount.kind === "fixed") {
  reduction.scaling.filter = {
    ...(reduction.scaling.filter ?? {}),
    distinctNames: true,
    excludeSelf: true,
  };
  const reductionEffect = compiled.effects.find((effect) => effect.actions.includes(reduction));
  if (reductionEffect !== undefined) {
    reductionEffect.actions.splice(reductionEffect.actions.indexOf(reduction), 1);
    if (reductionEffect.actions.length === 0) {
      compiled.effects.splice(compiled.effects.indexOf(reductionEffect), 1);
    }
  }
  compiled.effects.unshift({
    trigger: "BeforePayCost",
    actions: [
      {
        kind: "ReducePlayCost",
        payment: { kind: "automatic", condition: { kind: "true" } },
        amount: { kind: "fixed", value: reduction.amount.value },
        scaling: reduction.scaling,
      },
    ],
  });
}
const securityReturn = compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0];
if (securityReturn?.kind === "Return") {
  securityReturn.target.filter.kind = undefined;
}
const mainPlay = compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0];
if (mainPlay?.kind === "PlayWithoutCost") {
  mainPlay.from = ["hand"];
  mainPlay.target.filter = {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Fanglongmon"], match: "name" }],
  };
}

compiled.effects = compiled.effects.filter(
  (effect) =>
    !(
      (effect.trigger === "Static" || effect.trigger === "BeforePayCost") &&
      effect.actions.length === 0 &&
      (effect.keywords?.length ?? 0) === 0
    ),
);

compiled.coverage = "full";
compiled.residual = [];
registerIrCard("EX5-072", compiled);
