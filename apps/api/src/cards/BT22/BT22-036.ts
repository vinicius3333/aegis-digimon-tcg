// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT22-036 (Chaperomon).
// [Hand][Main]: conditional digivolve-from-trash effect (cost 3, ignoring reqs, Arisa condition).
// <Overclock>: EndOfYourTurn trigger — delete Token or other [Puppet] Digimon → attack player without suspending.
// Inherited [All Turns]: Replacement prevents leaving play (excluding own effects) via delete Token or other [Puppet].
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            {
              tokens: ["Arisa Kinosaki"],
              match: "name",
            },
          ],
        },
        raw: "you have [Arisa Kinosaki]",
      },
      actions: [
        {
          kind: "DigivolveViaPlacement",
          placeCost: {
            kind: "placeFromTrash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["ShoeShoemon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            destination: "digivolutionStack",
            position: "bottom",
            hostFilter: {
              nameOrTrait: [
                {
                  tokens: ["Shoemon"],
                  match: "name",
                },
              ],
            },
            raw: "by placing 1 [ShoeShoemon] from your trash as any of your [Shoemon]'s bottom digivolution card",
          },
          into: {
            isSelfRef: true,
          },
          cost: 3,
          ignoreDigivolutionRequirements: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          attackPlayer: true,
          withoutSuspending: true,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kindOrToken: ["Digimon", "Token"],
                nameOrTrait: [
                  {
                    tokens: ["Puppet"],
                    match: "trait",
                  },
                ],
                allowTokens: true,
              },
              count: 1,
            },
            raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon",
          },
        },
      ],
      keywords: [
        {
          keyword: "Overclock",
          raw: "＜Overclock ([Puppet] Trait)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          excludeOwnEffects: true,
          optional: true,
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
            },
          ],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kindOrToken: ["Digimon", "Token"],
                nameOrTrait: [
                  {
                    tokens: ["Puppet"],
                    match: "trait",
                  },
                ],
                allowTokens: true,
              },
              count: 1,
            },
            raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon, it doesn't leave",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-036", compiled);
