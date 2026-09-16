import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const guilmonTamer: Filter = {
  controller: "mine",
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["Guilmon"], match: "text" }],
};

const deleteOrBuff = (): Action[] => [
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        dp: { op: "lte", value: 5000 },
      },
      count: 1,
    },
  },
  {
    kind: "GainKeyword",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
    duration: "forTheTurn",
    condition: { kind: "ifThisEffectDidNotDelete", raw: "this effect didn't delete" },
  },
  {
    kind: "ModifyDP",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    amount: 3000,
    duration: "forTheTurn",
    condition: { kind: "ifThisEffectDidNotDelete", raw: "this effect didn't delete" },
  },
];

const playGuilmonTamer = (): Action => ({
  kind: "PlayWithoutCost",
  target: { filter: guilmonTamer, count: 1 },
  from: ["hand", "trash"],
  payCost: false,
  optional: true,
});

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Engage", raw: "＜Engage＞" }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
        },
      ],
    },
    { trigger: "WhenDigivolving", actions: deleteOrBuff() },
    { trigger: "WhenAttacking", actions: deleteOrBuff() },
    { trigger: "EndOfAttack", actions: [playGuilmonTamer()] },
    { trigger: "OnDeletion", actions: [playGuilmonTamer()] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              condition: {
                kind: "selfHasNameContaining",
                names: ["Gallantmon"],
                raw: "this Digimon has [Gallantmon] in its name",
              },
            },
          ],
          raw: "When any of your opponent's Digimon are deleted, if this Digimon has [Gallantmon] in its name, trash their top security card",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-013", compiled);
