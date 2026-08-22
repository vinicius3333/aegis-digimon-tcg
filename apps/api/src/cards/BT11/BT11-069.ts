// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "dpReductionImmunity",
          tokens: ["DeDigivolveImmunity"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["MetalGreymon", "X Antibody"], match: "name" }] },
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenUnsuspended",
        sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        actions: [{
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "raw", raw: "this Digimon has [Greymon] or [Omnimon] in its name" },
        }],
      }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-069", compiled);
