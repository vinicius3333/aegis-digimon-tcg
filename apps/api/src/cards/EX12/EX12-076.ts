import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX12-076 (Susanoomon).
//
// Both halves of the [When Attacking] "Then, ..." clause are gated on
// `selfDigivolutionStackDistinctColorCount >= 4`, which reads the LIVE source permanent and
// returns false once the card has left the battle area — exactly what KB Q7194 requires when an
// immediate-type effect removes Susanoomon while the first part resolves.
//
// The -3000 DP scaling uses `unit: "digivolutionCardColors"`, which counts distinct colors across
// the WHOLE stack (`interpreter/scaling.ts`), Digi-Eggs included; it never consults its `filter`,
// so no card kind is silently excluded.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              zone: "digivolutionCards",
            },
            unit: "digivolutionCardColors",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              zone: "digivolutionCards",
            },
            unit: "digivolutionCardColors",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "opponent",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          toTop: true,
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            op: "gte",
            value: 4,
            raw: "this Digimon has 4 or more colors in its digivolution cards",
          },
        },
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
            keyword: "Recovery",
            amount: 1,
            raw: "＜Recovery +1＞",
          },
          // `GainKeywordAction.duration` is required. ＜Recovery＞ is an ACTION-type keyword:
          // `runBoardAction` performs the verb (`recoverToSecurity`) and returns before the
          // grant is recorded anywhere, so the value is inert. "permanent" matches the shape
          // every other inline ＜Recovery +N＞ in this set uses (EX12-042, EX12-045).
          duration: "permanent",
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            op: "gte",
            value: 4,
            raw: "this Digimon has 4 or more colors in its digivolution cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Hybrid"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Hybrid", "Shambala", "TS"],
      cost: 5,
      isAlternate: true,
    },
  ],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 8,
          traits: ["Hybrid", "Shambala"],
          differentNames: true,
        },
      ],
      reduceCost: 9,
    },
  ],
};

registerIrCard("EX12-076", compiled);

export { compiled };
