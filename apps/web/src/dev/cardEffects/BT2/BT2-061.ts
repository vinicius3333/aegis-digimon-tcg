import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function andromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "attacked" ? 0 : 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const andromon = permanent("demo-andromon-bt2", "BT2-061", 0, 7000);
  andromon.keywords.push("Blocker");
  you.battleArea.push(andromon);
  if (effect !== "attacked") {
    const attacker = permanent("demo-andromon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") andromon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  } else {
    andromon.isSuspended = true;
    opponent.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [andromon.permanentId],
        },
      ],
    };
  }
  const descriptions: Record<string, string> = {
    blocked: "Andromon suspended to block and redirected the attack away from the player.",
    declined: "Andromon declined to block, remained ready, and the attack checked security.",
    attacked: "Andromon may attack during its controller's turn because it has no attack restriction.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-061",
        effectKey: `BT2-061/${effect}`,
        description: descriptions[effect] ?? "Andromon's Blocker state is displayed.",
        timing: "Main",
      },
    ],
  };
}
