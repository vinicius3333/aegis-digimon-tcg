import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] } satisfies Filter;
const opponentLowDp = { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } } satisfies Filter;
const ownDigimon = { controller: "mine", kind: ["Digimon"] } satisfies Filter;

const onPlayBody = [
  {
    effectTextPart: "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -4000 DP until their turn ends.",
    kind: "ModifyDP",
    target: { filter: opponentDigimon, count: 1 },
    amount: -4000,
    duration: "untilOpponentTurnEnd",
  },
  {
    effectTextPart:
      "Then, by returning 1 card in your trash to the bottom of the deck, delete 1 of your opponent's 5000 DP or lower Digimon.",
    kind: "Return",
    target: { filter: { controller: "mine", zone: "trash" }, count: 1 },
    from: ["trash"],
    to: "deckBottom",
    optional: true,
    trackCount: "returnedTrash",
  },
  {
    effectTextPart:
      "Then, by returning 1 card in your trash to the bottom of the deck, delete 1 of your opponent's 5000 DP or lower Digimon.",
    kind: "Delete",
    target: { filter: opponentLowDp, count: 1 },
    condition: { kind: "ifThisEffectActed" },
  },
] satisfies Action[];

const reactiveBuff = [
  {
    kind: "SelectBind",
    target: { filter: ownDigimon, count: 1, bindAs: "buffTarget" },
    optional: true,
    abortOnDecline: true,
    preserveOncePerTurnOnDecline: true,
  },
  {
    kind: "ModifyDP",
    target: { filter: { boundRef: "buffTarget" }, count: 1 },
    amount: 3000,
    duration: "untilOpponentTurnEnd",
  },
  { kind: "Attack", target: { filter: { boundRef: "buffTarget" }, count: 1 }, mandatory: true },
] satisfies Action[];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: onPlayBody },
    { trigger: "WhenDigivolving", actions: onPlayBody },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToDeck",
          actions: reactiveBuff,
          raw: "When your effect adds cards to a deck, 1 of your Digimon may get +3000 DP and attack.",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToDeck",
          fireCondition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }] },
          },
          actions: [
            // "...may unsuspend": the unsuspension is the optional half of the printed clause.
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              optional: true,
              preserveOncePerTurnOnDecline: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-015", compiled);
