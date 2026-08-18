// HAND-FIXED IR for AD1-021 (Marcus Damon & Agumon) — do not regenerate over this file.
//
// The generated [End of Your Turn] effect mistargeted the whole "1 of your [Marcus
// Damon]s is also treated as a 6000 DP Digimon, gains <Rush> and can't digivolve"
// bundle: it filtered on kind:["Digimon"] (Marcus Damon is a TAMER, so nothing ever
// matched — KB Q6111) and dropped the treated-as-Digimon/6000-DP/can't-digivolve
// no kind check) and applies BecomeDigimonThatCantDigivolve(DP 6000, UntilEachTurnEnd)
// + GainRush(UntilEachTurnEnd), then offers ONE optional "1 of your Digimon may
// attack". All four bundle actions target the same lone name-matched permanent.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type Actions = CompiledCard["effects"][number]["actions"];

// "1 of your [Marcus Damon]s" — name-matched, deliberately kind-unrestricted (a Tamer).
const marcusTarget = {
  filter: {
    controller: "mine",
    nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }],
  },
  count: 1,
};

// "If you have a yellow Digimon with [Agumon] or [Greymon] in its name" (documented behavior
// PermanentCondition gates the Marcus bundle only; the trailing attack is ungated).
const agumonGate = {
  kind: "youHave",
  filter: {
    controllerDefault: "mine",
    kind: ["Digimon"],
    colors: ["Yellow"],
    nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }],
  },
  raw: "you have a yellow Digimon with [Agumon] or [Greymon] in its name",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
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
            colors: ["Yellow"],
            nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
          },
          reduceCost: 3,
        },
      ] as unknown as Actions,
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: marcusTarget,
          grant: "kinds",
          tokens: ["Digimon"],
          duration: "forTheTurn",
          condition: agumonGate,
        },
        {
          kind: "SetBaseDP",
          target: marcusTarget,
          value: 6000,
          duration: "forTheTurn",
          condition: agumonGate,
        },
        {
          kind: "GainKeyword",
          target: marcusTarget,
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          condition: agumonGate,
        },
        {
          kind: "Restrict",
          target: marcusTarget,
          restriction: "digivolve",
          duration: "forTheTurn",
          condition: agumonGate,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ] as unknown as Actions,
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ] as unknown as Actions,
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("AD1-021", compiled);
