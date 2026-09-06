import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT25-060 (Rebootmon).
// Fixes:
// 1. AllTurns SubTrigger: added GrantStatic immuneToOpponentDigimonEffects action
//    — text says "opponent's Digimon effects don't affect it" (KB Q6358/Q6363).
// 2. AllTurns SubTrigger: added a second SubTrigger for "whenUnsuspended" (the text
//    fires on "gets linked OR unsuspends").
// 3. KB Q6357: the linked card must itself carry <Link>; the link is modeled as an explicit
//    free Link action followed by the dependent unsuspend.
const compiled: CompiledCard = {
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
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Link",
          amount: 1,
          raw: "＜Link +1＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              hasLinkRequirement: true,
            },
            count: 1,
            source: "thisDigimon",
          },
          recipient: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              hasLinkRequirement: true,
            },
            count: 1,
            source: "thisDigimon",
          },
          recipient: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
              duration: "untilYourTurnEnd",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "untilYourTurnEnd",
            },
            {
              kind: "GrantStatic",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              grant: "immuneToOpponentDigimonEffects",
              duration: "untilYourTurnEnd",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
              duration: "untilYourTurnEnd",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "untilYourTurnEnd",
            },
            {
              kind: "GrantStatic",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              grant: "immuneToOpponentDigimonEffects",
              duration: "untilYourTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Bootmon", "Shutmon"],
      cost: 0,
    },
  ],
};

registerIrCard("BT25-060", compiled);
export { compiled };
