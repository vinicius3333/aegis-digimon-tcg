import type { Action, CardEffect, CompiledCard, Filter, Scaling, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownDigimon = { controller: "mine", kind: ["Digimon"] } satisfies Filter;

const suspendAnyDigimon: Action = {
  kind: "Suspend",
  target: { filter: { controller: "any", kind: ["Digimon"], unsuspended: true }, count: 1 },
  optional: true,
  raw: "You may suspend 1 Digimon",
};

const returnLowestDp: Action = {
  kind: "Return",
  target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
  to: "deckBottom",
  optional: true,
  raw: "you may return 1 of your opponent's lowest DP Digimon to the bottom of the deck",
};

const traitGate = [{ tokens: ["Mammal", "Beast", "Beastkin", "Royal Knight"], match: "trait" as const }];
const playableFromHand = {
  filter: { controllerDefault: "mine", zone: "hand", kind: ["Digimon", "Tamer"], nameOrTrait: traitGate },
  count: 1,
} satisfies Target;
const optionInHand = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Option"],
  nameOrTrait: traitGate,
} satisfies Filter;

const perSuspendedDigimon: Scaling = {
  per: 1,
  filter: { controllerDefault: "any", kind: ["Digimon"], suspended: true },
  unit: "cards",
};

const playOrUseTraitCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Mammal]/[Beast]/[Beastkin]/[Royal Knight] card", "Use such an Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableFromHand,
        from: ["hand"],
        payCost: true,
        allowDigiXros: true,
        reduceCostBy: 4,
        reduceCostByScaling: perSuspendedDigimon,
        optional: true,
        raw: "You may play 1 [Mammal], [Beast], [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4. For each suspended Digimon, further reduce it by 1",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionInHand,
        from: ["hand"],
        payCost: true,
        reduceCostBy: 4,
        reduceCostByScaling: perSuspendedDigimon,
        optional: true,
        raw: "You may use 1 [Mammal], [Beast], [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4",
      },
    ],
  ],
};

const PLAY_USE_KEY = "EX13-043/play-or-use-trait-card";

const preventSuspendedLeave: Action = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  leaveCause: "otherThanYourEffect",
  optional: true,
  affectsAll: true,
  sourceFilter: { ...ownDigimon, suspended: true },
  target: { filter: { ...ownDigimon, suspended: true }, count: "all" },
  cost: {
    kind: "unsuspend",
    target: { filter: { ...ownDigimon, suspended: true }, count: 1 },
    raw: "by unsuspending 1 of your Digimon",
  },
  raw: "When any of your suspended Digimon would leave the battle area other than by your effects, by unsuspending 1 of your Digimon, they don't leave",
};

const suspendAndBounce = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [suspendAnyDigimon, returnLowestDp],
});

const playOrUse = (trigger: "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: PLAY_USE_KEY,
  actions: [playOrUseTraitCard],
});

export const compiled: CompiledCard = {
  cardId: "EX13-043",
  effects: [
    suspendAndBounce("OnPlay"),
    suspendAndBounce("WhenDigivolving"),
    playOrUse("WhenDigivolving"),
    playOrUse("WhenAttacking"),
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [preventSuspendedLeave] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Leopardmon: Leopard Mode"], cost: 1, isAlternate: true }],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [5, 4, 3].map((level) => ({
        count: 1,
        level,
        colors: ["Green" as const],
        traits: ["Mammal", "Beast", "Beastkin"],
      })),
    },
  ],
};

registerIrCard("EX13-043", compiled);
