// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{
        kind: "WaiveColorRequirement",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        condition: { kind: "youHave", filter: {
          controllerDefault: "mine", kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Matt Ishida"], match: "name" }],
        }, raw: "you have a Tamer with [Matt Ishida] in its name" },
      }],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "Return", target: { filter: { controller: "mine", zone: "trash", kind: ["Digimon"] }, count: 1 }, to: "hand" },
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }] }, count: 1 },
          effectText: "OnDeletionPlaySelfMandatory",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST16-15", compiled);
export { compiled };
