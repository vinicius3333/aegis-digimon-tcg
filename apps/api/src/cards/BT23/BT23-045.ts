import type { Action, CompiledCard, Condition, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ELIGIBLE_COST_CARD: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    {
      tokens: ["Royal Base", "Zaxon"],
      match: "trait",
    },
  ],
};

const RETURN_TARGET: Target = {
  filter: {
    controller: "opponent",
    kind: ["Digimon"],
    dp: {
      op: "lte",
      relativeToSource: true,
    },
  },
  count: 1,
};

const PLACEMENT_RAW =
  "By placing 1 [Royal Base] or [Zaxon] trait Digimon card from your hand or trash face up as the bottom security card";

const HAS_ELIGIBLE_TRASH_CARD: Condition = {
  kind: "selfHasMinTrash",
  count: 1,
  filter: ELIGIBLE_COST_CARD,
};

const returnByPlacement = (): Action[] =>
  structuredClone<Action[]>([
    {
      kind: "ConditionalBranch",
      condition: HAS_ELIGIBLE_TRASH_CARD,
      ifTrue: [
        {
          kind: "Return",
          target: RETURN_TARGET,
          to: "hand",
          cost: {
            kind: "place",
            target: {
              filter: ELIGIBLE_COST_CARD,
              count: 1,
              from: ["hand", "trash"],
            },
            raw: PLACEMENT_RAW,
            destination: "security",
            position: "bottom",
            faceDown: false,
          },
        },
      ],
      ifFalse: [
        {
          kind: "Return",
          target: RETURN_TARGET,
          to: "hand",
          cost: {
            kind: "place",
            target: {
              filter: ELIGIBLE_COST_CARD,
              count: 1,
              from: ["hand"],
            },
            raw: PLACEMENT_RAW,
            destination: "security",
            position: "bottom",
            faceDown: false,
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ]);

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: returnByPlacement(),
    },
    {
      trigger: "WhenDigivolving",
      actions: returnByPlacement(),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              cost: {
                kind: "flipSecurity",
                target: {
                  filter: {
                    zone: "security",
                    controller: "mine",
                    position: "top",
                    faceUp: true,
                  },
                  count: 1,
                },
                raw: "by flipping your top face-up security card face down",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Royal Base", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-045", compiled);
