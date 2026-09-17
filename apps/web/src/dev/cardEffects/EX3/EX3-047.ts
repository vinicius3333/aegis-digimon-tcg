import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function jazamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited") {
    const onPlayHost = permanent("demo-jazamon-on-play-host", "EX3-048", 0, 4000, [
      { instanceId: "demo-jazamon-active-source", cardId: "EX3-047" },
    ]);
    onPlayHost.currentDP = 5000;
    const plainHost = permanent("demo-jazamon-plain-host", "EX3-049", 0, 4000, [
      { instanceId: "demo-jazamon-inactive-source", cardId: "EX3-047" },
    ]);
    you.battleArea.push(onPlayHost, plainHost);
    opponent.battleArea.push(permanent("demo-jazamon-opponent", "EX3-044", 1, 11000));
    state.players.push(you, opponent);
    return { state };
  }

  you.battleArea.push(permanent("demo-jazamon", "EX3-047", 0, 1000), permanent("demo-jazamon-hina", "EX3-065", 0, 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);
  return {
    state,
    events: [{ kind: "memoryChanged", from: 0, to: 1, reason: "Jazamon: Hina Kurihara foi jogada" }],
  };
}
