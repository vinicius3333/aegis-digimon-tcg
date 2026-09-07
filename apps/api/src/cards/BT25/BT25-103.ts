import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
//
// Verified against catalog text and Q6488-Q6493/Q6717. The printed
// [When Attacking] [Counter] clause is represented at both activation seams, but both entries
// share one source-instance OPT key. `scope: "acrossDigimon"` is required by "for each ...
// trash any 1 ... from your opponent's Digimon": the chosen cards form one combined pool and
// may come from different hosts. EndAttack changes combat timing rather than affecting the
// attacker, so immunity does not stop it and the normal End of Attack window still fires.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "IceClad",
          raw: "＜Ice Clad＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition ([Apollomon] & [Dianamon])＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              digivolutionCardsCompareToSource: "lte",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              digivolutionCardsCompareToSource: "lte",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          scope: "acrossDigimon",
          optional: true,
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "EndAttack",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "BT25-103/trash-sources-end-attack",
    },
    {
      trigger: "Counter",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          scope: "acrossDigimon",
          optional: true,
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "EndAttack",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "BT25-103/trash-sources-end-attack",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-103", compiled);
