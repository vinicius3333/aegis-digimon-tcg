import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const vemmonInText = [{ tokens: ["Vemmon"], match: "text" as const }];

const trashDrawGain = [
  {
    kind: "Draw" as const,
    controller: "mine" as const,
    amount: 1,
    cost: {
      kind: "trash" as const,
      target: {
        filter: { zone: "hand" as const, controller: "mine" as const, nameOrTrait: vemmonInText },
        count: 1,
      },
      raw: "By trashing 1 card with [Vemmon] in its text from your hand",
    },
    optional: true,
    abortOnDecline: true,
  },
  // "By trashing 1 card ..., ＜Draw 1＞ and gain 1 memory": the trash cost gates both halves
  // (the Draw's `abortOnDecline` stops this action when the cost is declined or unpayable), but
  // the memory gain is NOT conditional on the draw succeeding. An `ifThisEffectActed` condition
  // here read `ctx.lastEffectActed`, which the Draw sets to false on an empty deck, silently
  // dropping a memory the printed text still grants.
  { kind: "GainMemory" as const, amount: 1 },
];

const revealForTriggeredDigimon = {
  kind: "RevealAdd" as const,
  revealCount: 2,
  add: [
    {
      filter: {
        controllerDefault: "mine" as const,
        nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" as const }],
      },
      count: "all" as const,
      to: "placeUnder" as const,
      underFilter: { isTriggerSource: true },
    },
  ],
  rest: "trash" as const,
  cost: {
    kind: "suspend" as const,
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  optional: true,
  abortOnDecline: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Zenith"],
        },
      ],
    },
    { trigger: "StartOfYourMainPhase", actions: trashDrawGain },
    { trigger: "OnPlay", actions: trashDrawGain },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: vemmonInText },
          actions: [revealForTriggeredDigimon],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: vemmonInText },
          actions: [revealForTriggeredDigimon],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-066", compiled);
