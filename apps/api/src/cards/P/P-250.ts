import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-250 Ogremon (X Antibody) — Purple/Black Lv.4 Champion, [Demon]/[X Antibody].
//
// [Digivolve] [Ogremon]/[Fugamon]/[Hyogamon]: Cost 1
//
// [Trash] [End of Your Turn] If you have 5 or fewer cards in hand, 1 of your [Demon] trait
//   Digimon may digivolve into this card.
// [On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 card in your hand,
//   1 of your [Demon], [Shaman] or [Undead] trait Digimon gains ＜Blocker＞ and ＜Retaliation＞
//   until your opponent's turn ends.
//
// Inherited: [On Deletion] Delete 1 of your opponent's Digimon with a play cost of 6 or less.
//
// Encoding notes:
// - The `[Digivolve]` header is an alternate path on three EXACT printed names, so `namesExact`
//   (BT5-067): a substring `names` match would wrongly accept relatives of those names.
// - The `[Trash][End of Your Turn]` clause mirrors BT24-080 Megidramon exactly — `isFromTrash`
//   plus a `Digivolve` whose `into` is this card while it sits loose in the trash (§15-14-3-1).
//   The ONE deliberate difference: BT24-080 prints "without paying the cost" and therefore
//   carries `payCost: false`; P-250 does NOT print that waiver, so the digivolution cost is paid
//   normally (`payCost: true`, as P-244's Delay digivolve does).
// - The shared `[Once Per Turn]` spans three timings on the same physical card, so all three
//   windows key the per-turn ledger on one `sharedUseKey` (P-203). Those three clauses carry NO
//   `effectKey`: `registration/module.ts` reads `effectKey ?? sharedUseKey`, so a per-timing
//   `effectKey` would silently split the ledger back into three independent uses.
// - "By trashing 1 card in your hand" is a processing condition the player may decline
//   (CR 15-7-4 / 15-7-2): the leading grant carries the cost with `optional` + `abortOnDecline`,
//   which also aborts the ＜Retaliation＞ half of the same clause (P-203, P-247). The second
//   grant reuses the first's chosen recipient via `sameTarget` — "gains X and Y" is one target.
const demonShamanUndead = [{ tokens: ["Demon", "Shaman", "Undead"], match: "trait" as const }];

const handTrashCost = {
  kind: "trash" as const,
  target: {
    filter: { zone: "hand" as const, controller: "mine" as const },
    count: 1,
  },
  raw: "By trashing 1 card in your hand",
};

const grantBlockerAndRetaliation = [
  {
    kind: "GainKeyword" as const,
    target: {
      filter: { controller: "mine" as const, kind: ["Digimon" as const], nameOrTrait: demonShamanUndead },
      count: 1,
    },
    keyword: { keyword: "Blocker" as const, raw: "＜Blocker＞" },
    duration: "untilOpponentTurnEnd" as const,
    cost: handTrashCost,
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "GainKeyword" as const,
    target: {
      filter: { controller: "mine" as const, kind: ["Digimon" as const], nameOrTrait: demonShamanUndead },
      count: 1,
      sameTarget: true,
    },
    keyword: { keyword: "Retaliation" as const, raw: "＜Retaliation＞" },
    duration: "untilOpponentTurnEnd" as const,
  },
];

export const compiled: CompiledCard = {
  cardId: "P-250",
  effects: [
    {
      effectKey: "P-250/trash-digivolve",
      trigger: "EndOfYourTurn",
      isFromTrash: true,
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Demon"], match: "trait" }],
            },
            count: 1,
          },
          into: {
            controller: "mine",
            zone: "trash",
            isSelfRef: true,
            kind: ["Digimon"],
          },
          from: ["trash"],
          payCost: true,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 5,
            raw: "you have 5 or fewer cards in hand",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: grantBlockerAndRetaliation,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: grantBlockerAndRetaliation,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: grantBlockerAndRetaliation,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      effectKey: "P-250/inherited-on-deletion",
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 6,
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Ogremon", "Fugamon", "Hyogamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-250", compiled);
