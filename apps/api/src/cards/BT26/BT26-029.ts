// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownDigimon = { controller: "mine", kind: ["Digimon"] };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const protectedTarget = { filter: ownDigimon, count: 1, bindAs: "protectedDigimon" };
const protection = [
  {
    kind: "CostGatedBlock",
    cost: { kind: "trashSecurityTop", controller: "mine" },
    optional: true,
    abortOnDecline: true,
    actions: [
      { kind: "SelectBind", target: protectedTarget },
      {
        kind: "Restrict",
        target: { fromSelectionRef: "protectedDigimon" },
        restriction: "dpImmune",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
      },
      {
        kind: "StackTrashLock",
        target: { fromSelectionRef: "protectedDigimon" },
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "Restrict",
        target: { fromSelectionRef: "protectedDigimon" },
        restriction: "returnToHandOrDeck",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
      },
    ],
  },
];

const securityRemovalWatcher = (event, oncePerTurnKey, actions) => ({
  kind: "SubTrigger",
  event,
  fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
  oncePerTurnKey,
  actions,
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: protection },
    { trigger: "WhenDigivolving", actions: protection },
    {
      trigger: "Static",
      keywords: [
        { keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" },
        { keyword: "Ascension", raw: "＜Ascension＞" },
      ],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanBattle",
          raw: "＜Decode ([Aegiomon])＞: when this Digimon would leave other than in battle, you may play 1 [Aegiomon] from its digivolution cards without paying the cost.",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  zone: "digivolutionCards",
                  kind: ["Digimon"],
                  // Decode's bracket-only reference (§2-3-1-2) names exactly
                  // [Aegiomon], rather than every card containing that text.
                  nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }],
                },
                count: 1,
              },
              fromOwnDigivolutionStack: true,
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Angel"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        securityRemovalWatcher("whenSecurityRemoved", "BT26-029/security-removed-dp", [
          { kind: "ModifyDP", target: { filter: opponentDigimon, count: 3 }, amount: -5000, duration: "forTheTurn" },
        ]),
        securityRemovalWatcher("whenEffectRemovesFromSecurity", "BT26-029/security-removed-dp", [
          { kind: "ModifyDP", target: { filter: opponentDigimon, count: 3 }, amount: -5000, duration: "forTheTurn" },
        ]),
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        securityRemovalWatcher("whenSecurityRemoved", "BT26-029/inherited-security-removed-dedigivolve", [
          { kind: "DeDigivolve", target: { filter: opponentDigimon, count: 1 }, amount: 1 },
        ]),
        securityRemovalWatcher("whenEffectRemovesFromSecurity", "BT26-029/inherited-security-removed-dedigivolve", [
          { kind: "DeDigivolve", target: { filter: opponentDigimon, count: 1 }, amount: 1 },
        ]),
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Aegiomon"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-029", compiled);
