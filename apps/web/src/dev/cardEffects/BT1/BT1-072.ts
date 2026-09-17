import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function woodmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "blocker" ? 1 : 0;
  state.memory = effect === "attacked" ? 1 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const woodmon = permanent("demo-woodmon", "BT1-072", 0, 6000);
  woodmon.keywords.push("Blocker");
  if (effect === "attacked") woodmon.isSuspended = true;
  you.battleArea.push(woodmon);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "blocker") {
    const attacker = permanent("demo-woodmon-attacker", "BT1-010", 1, 5000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [woodmon.permanentId],
        },
      ],
    };
  }

  if (effect !== "attacked") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-072",
        effectKey: "BT1-072/attack-cost",
        description: "Woodmon's When Attacking effect loses 2 memory.",
        timing: "When Attacking",
      },
    ],
  };
}
