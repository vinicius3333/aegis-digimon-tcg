import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function cyberdramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-cyberdramon-host", "EX3-054", 0, 12000, [
    { instanceId: "demo-cyberdramon-source", cardId: "EX3-050" },
  ]);
  const hina = permanent("demo-cyberdramon-hina", "EX3-065", 0, 0);
  if (effect !== "inactive") {
    hina.isSuspended = true;
    host.currentDP = 14000;
  }
  you.battleArea.push(host, hina);
  opponent.battleArea.push(permanent("demo-cyberdramon-opponent", "EX3-053", 1, 12000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  return { state };
}
