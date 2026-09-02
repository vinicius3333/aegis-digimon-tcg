import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR override for BT23-024 (08-07). The [All Turns] suspend-restriction
// -with-superlative-exception clause is authored as ArmSuspendRestriction (A3-proven,
// preserves this override instead of regenerating it back to RawUnparsed (regen:check).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Evade",
            raw: "＜Evade＞",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Link",
            amount: 1,
            raw: "＜Link +1＞",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            source: "thisDigimon",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Appmon"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Link",
          target: {
            source: "thisDigimon",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Appmon"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "ArmSuspendRestriction",
              duration: "untilOpponentTurnEnd",
              cost: {
                kind: "unsuspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
          raw: "When this Digimon gets linked, by unsuspending it, other than their highest play cost Digimon, none of your opponent's Digimon can suspend until their turn ends",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [{ names: ["Oujamon", "Beautymon"], cost: 0 }],
};

registerIrCard("BT23-024", compiled);
