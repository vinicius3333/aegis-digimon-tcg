import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function salamonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-bt3-036-host", "BT3-036", 0, 6000);
  host.stack.push(card("demo-bt3-033-inherited", "BT3-033", 0));
  const first = permanent("demo-bt3-033-target", "BT1-019", 1, effect === "resolved" ? 3000 : 4000);
  const second = permanent("demo-bt3-033-other", "BT1-019", 1, 4000);
  you.battleArea.push(host);
  opponent.battleArea.push(first, second);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-033",
        effectKey: `BT3-033/${effect ?? "resolved"}`,
        description: "Salamon's inherited effect gave one opposing Digimon -1000 DP for the turn.",
        timing: "WhenAttacking",
      },
    ],
  };
}
