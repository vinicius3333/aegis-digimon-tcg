import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// HAND-FIXED IR for BT19-077 — do not regenerate.
// Re-audit fix: the [On Deletion] "place this card on top of your security stack" carried an
// explicit `source: { filter: { isSelfRef: true } }`. That branch of
// `interpreter/actions/actions/security.ts` resolves PERMANENTS, and the permanent is already
// gone by the time an [On Deletion] effect resolves, so `ids.length === 0` and the card was
// trashed instead. The self form is `source` OMITTED (BT2-040 Ophanimon), which falls back to
// `ctx.source.instanceId` and survives the deletion.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 2000,
              },
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          from: ["hand"],
          payCost: true,
          reduceCost: 2,
          optional: true,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By suspending this Digimon",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "attackOrBlock",
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-077", compiled);
