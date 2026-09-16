import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

const cantAttackPlayers = (): Action => ({
  kind: "Restrict",
  target: { filter: theirDigimon, count: 1 },
  restriction: "attackPlayers",
  duration: "untilOpponentTurnEnd",
  raw: "1 of your opponent's Digimon can't attack players until their turn ends",
});

export const compiled: CompiledCard = {
  cardId: "EX13-054",
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      isSecurity: true,
      description: "[Security] At the end of the battle, play this card without paying the cost.",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    },
    { trigger: "OnPlay", actions: [cantAttackPlayers()] },
    { trigger: "OnDeletion", actions: [cantAttackPlayers()] },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Mutant"],
          duration: "permanent",
          raw: "[Rule] Trait: Has [Mutant] Type.",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-054", compiled);
