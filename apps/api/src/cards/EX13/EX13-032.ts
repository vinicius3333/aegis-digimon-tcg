import type { Action, CompiledCard, Cost, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const unsuspendThenLockDigivolving = (cost: Cost): Action => ({
  kind: "CostGatedBlock",
  cost,
  abortOnDecline: true,
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      raw: "this Digimon unsuspends",
    },
    {
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      restriction: "cannotActivateWhenDigivolving",
      duration: "untilOpponentTurnEnd",
      raw: "1 of your opponent's Digimon can't activate [When Digivolving] effects until their turn ends",
    },
  ],
});

const TRASH_SECURITY_LABEL = "Trash your top security card";
const TRASH_UNDER_TAMER_LABEL = "Trash the bottom face-down card from under 1 of your Tamers";

const unsuspendBody = (): Action[] => [
  {
    kind: "Modal",
    choose: 1,
    optional: true,
    labels: [TRASH_SECURITY_LABEL, TRASH_UNDER_TAMER_LABEL],
    options: [
      [
        unsuspendThenLockDigivolving({
          kind: "trashSecurityTop",
          controller: "mine",
          raw: "By trashing your top security card",
        }),
      ],
      [
        unsuspendThenLockDigivolving({
          kind: "trashBottomFaceDownUnderTamer",
          controller: "mine",
          raw: "By trashing the bottom face-down card from under any of your Tamers",
        }),
      ],
    ],
    raw: "By trashing your top security card or the bottom face-down card from under any of your Tamers",
  },
];

const placeOwnTopAsSecurityCost = (raw: string): Cost => ({
  kind: "place",
  targetIsPermanent: true,
  detachPermanentTop: true,
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  destination: "security",
  position: "top",
  raw,
});

const compiled: CompiledCard = {
  cardId: "EX13-032",
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: unsuspendBody(),
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: unsuspendBody(),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: placeOwnTopAsSecurityCost("by placing its top stacked card as the top security card"),
          raw: "When this Digimon would leave the battle area, by placing its top stacked card as the top security card, it doesn't leave",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "name" }],
          } satisfies Filter,
          actions: [],
          cost: placeOwnTopAsSecurityCost("by placing its top stacked card as the top security card"),
          raw: "When this Digimon with [Kentaurosmon] in its name would leave the battle area, by placing its top stacked card as the top security card, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-032", compiled);
