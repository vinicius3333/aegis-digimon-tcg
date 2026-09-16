import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-054 Nanimon (Digimon, Black, Lv.4 Champion [Invader], Virus, 3000 DP, play cost 3,
// printed EvoCosts Black Lv.3 for 2 and Yellow Lv.3 for 2).
//
// Printed main text:
//   [Security] At the end of the battle, play this card without paying the cost.
//   [On Play] [On Deletion] 1 of your opponent's Digimon can't attack players until their
//     turn ends.
//   [Rule] Trait: Has [Mutant] Type.
// Printed inherited text:
//   [All Turns] This Digimon gets +1000 DP.
// The [Security] clause is printed inside `effectText` rather than in the separate
// `securityEffectText` field, so the Security CardEffect carries an explicit `description` for
// decision and log provenance (the EX13-036 convention for the same catalog shape).
//
// KB: `node tools/kb/query.mjs card EX13-054` reports no entries — EX13 is pre-release. General
// rules consulted:
//   - comprehensive §13-1-6 / §13-4: a [Security] effect resolves while the checked card has no
//     area. "At the end of the battle" defers the body until the security battle is over, which
//     is why the play is wrapped in a `whenSecurityBattleEnded` watcher and the card is played
//     FROM THE TRASH — by then the checked card has already been trashed by the security battle.
//   - comprehensive §15-3-2 "can't attack players": a continuous restriction on the affected
//     Digimon; attacks against Digimon stay legal.
//   - comprehensive §4-23: a [Rule] trait grant adds the named type to this card's own traits.
//
// BT24-057 prints the same [Security] sentence and the same "can't attack players" pair of
// timings, and is the encoding copied here verbatim in structure.

const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

// "1 of your opponent's Digimon can't attack players until their turn ends" — "their" is the
// opponent, so the duration is `untilOpponentTurnEnd` read from the resolving controller's seat.
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
          // `once: true` unsubscribes the watcher the first time it fires: the deferral is a
          // one-shot for THIS security check, not a standing subscription.
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
