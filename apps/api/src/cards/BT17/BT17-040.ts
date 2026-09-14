import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
          effectTextPart:
            "Then, if [Leon Alexander] is in this Digimon's digivolution cards, all of your opponent's Digimon gain ＜Security Attack -1＞until the end of their turn.",
          kind: "GainKeyword",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
          duration: "untilOpponentTurnEnd",
          includeLaterEntrants: true,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "name" }] },
            raw: "[Leon Alexander] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart:
            "[End of Your Turn] [Once Per Turn] If you have 3 or more security cards, 1 of your opponent's Digimon gets -6000 DP for the turn. If you have 3 or fewer security cards, ＜Recovery +1 (Deck)＞.",
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -6000,
          duration: "forTheTurn",
          condition: { kind: "securityAtLeast", value: 3 },
        },
        {
          effectTextPart:
            "[End of Your Turn] [Once Per Turn] If you have 3 or more security cards, 1 of your opponent's Digimon gets -6000 DP for the turn. If you have 3 or fewer security cards, ＜Recovery +1 (Deck)＞.",
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
          amount: 1,
        },
        // "1 of your Digimon may attack an opponent's Digimon": `Attack.target` names the
        // ATTACKER (see AttackAction in the shared IR), not the defender.
        {
          effectTextPart: "Then, 1 of your Digimon may attack an opponent's Digimon.",
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          attackPlayer: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -8000,
              duration: "forTheTurn",
              condition: {
                kind: "selfHasNameContaining",
                names: ["Fenriloogamon"],
                raw: "this Digimon has [Fenriloogamon] in its name",
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  // "[Digivolve]Lv.5 w/[Pulsemon] in its text: Cost 3" -- an alternate reduced-cost path.
  // "in its text" is the source's full card-information union, so it uses `texts`, not `names`.
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Pulsemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-040", compiled);
