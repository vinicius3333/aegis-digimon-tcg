// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Beelzemon (X Antibody)"], match: "name" }],
        },
        actions: [{
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by returning this card to the bottom of your deck",
          },
          optional: true,
          abortOnDecline: true,
        }],
      }],
      isFromTrash: true,
    },
    {
      trigger: "Main",
      actions: [{
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
      }],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT12-110", compiled);
