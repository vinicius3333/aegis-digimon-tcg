// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
    {
      trigger: "OpponentsTurn",
      actions: [{ kind: "RedirectAttack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenUnsuspended",
        sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        actions: [{
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["BlackWarGreymon", "X Antibody"], match: "name" }] },
          },
          optional: true,
        }],
      }],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-074", compiled);
