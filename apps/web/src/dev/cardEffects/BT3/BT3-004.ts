import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function minomonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacksDigimon = effect !== "player-blocked";
  const host = permanent("demo-minomon-host", "BT1-084", 0, attacksDigimon ? 11000 : 10000);
  host.stack.push(card("demo-minomon-source", "BT3-004", 0));
  host.isSuspended = true;
  you.battleArea.push(host);
  if (attacksDigimon) {
    const target = permanent("demo-minomon-target", "BT1-010", 1, 2000);
    target.isSuspended = true;
    opponent.battleArea.push(target);
  } else {
    opponent.securityCount = 1;
    opponent.trash.push(card("demo-minomon-blocker-trash", "BT1-031", 1));
  }
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-004",
        effectKey: `BT3-004/${effect ?? "attack-digimon"}`,
        description: attacksDigimon
          ? "Minomon's inherited effect saw a declared attack on an opposing Digimon and gave its host +1000 DP for the turn."
          : "Q1047: The host declared an attack on the player, so being blocked did not grant Minomon's +1000 DP.",
        timing: "WhenAttacking",
      },
    ],
  };
}
