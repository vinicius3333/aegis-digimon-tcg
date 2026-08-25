// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4843: the Then clause (-6000 DP) always fires regardless of the if-condition.
// Audit fixes (LM audit): the Security Digimon debuff moved from a permanent ModifyDP over a
// `zone: "security"` filter (which never resolves — Security Digimon are loose cards) to the
// security-DP ledger, and the pooled digivolution-card target count "any" became "all".
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
    },
    {
      // "Trash any 4 digivolution cards from your opponent's Digimon"
      // "any 4" = 4 cards collectively across opponent's Digimon, player chooses which;
      // not restricted to top cards and not locked to a single Digimon.
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          scope: "acrossDigimon",
          amount: 4,
          fromTop: false,
          distributed: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          // If opponent has no Digimon with >= digivolution cards as this Digimon, unsuspend self.
          kind: "Unsuspend",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "opponentHasNone",
            filter: {
              // `digivolutionCardsCompareToSource` is the supported comparison; the previous
              // `digivolutionCardsGteSource` flag matched nothing, so the gate always held.
              digivolutionCardsCompareToSource: "gte",
              controller: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with as many or more digivolution cards as this Digimon",
          },
        },
        {
          // "Then, all of your opponent's Security Digimon get -6000 DP for the turn."
          // Always fires (KB Q4843). Security Digimon are loose cards, not battle-area
          // permanents, so this is the security-DP ledger delta, not a permanent ModifyDP:
          // a `zone: "security"` ModifyDP resolved no targets at all.
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -6000,
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Shakkoumon", "Zudomon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("LM-040", compiled);
