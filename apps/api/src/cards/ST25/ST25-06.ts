import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Filter } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const alysionDigimon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
};

const shieldAndBoost: Action[] = [
  {
    kind: "Restrict",
    effectTextPart:
      "By suspending this Tamer, for the turn, 1 of your Digimon isn't affected by your opponent's Option effects and gets +3000 DP.",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    restriction: "beAffected",
    duration: "forTheTurn",
    fromSourceKind: ["Option"],
    byOpponentEffectsOnly: true,
    cost: {
      kind: "suspend",
      optional: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      raw: "by suspending this Tamer",
    },
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "ModifyDP",
    target: { filter: { controllerDefault: "mine" }, count: 1, sameTarget: true },
    amount: 3000,
    duration: "forTheTurn",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    },
    {
      trigger: "YourTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: alysionDigimon, actions: shieldAndBoost },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: alysionDigimon,
          actions: shieldAndBoost,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST25-06", compiled);
